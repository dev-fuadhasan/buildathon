import { groq, isGroqConfigured } from "./groqClient";
import { getSafetyPrompt } from "./safetyGuardrails";
import { retrieveRelevantGuidelines, formatGuidelinesForContext } from "./medicalKnowledge";
import { searchDatasetByLanguage, searchDatasetDual, searchDatasetHybrid, formatDatasetContext, type Language } from "./dualDatasetLoader";
import { detectLanguage, translateToEnglish } from "./translation";
import { getForcedLanguage } from "./datasetConfig";
import { shouldUseProfileData, needsFollowUpQuestions } from "./chatHelper";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// In-memory cache for compact mother profiles (per motherId)
// Not persisted; safe for short-lived performance boost
const profileCache = new Map<string, {
  summary: string;
  bloodGroup?: string;
  weeks?: number;
  dueDate?: string;
  conditions?: string;
  medications?: string;
  lastUpdated: number;
}>();

const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function setProfileCache(motherId: string, data: {
  summary: string;
  bloodGroup?: string;
  weeks?: number;
  dueDate?: string;
  conditions?: string;
  medications?: string;
}) {
  profileCache.set(motherId, { ...data, lastUpdated: Date.now() });
}

function getProfileCache(motherId: string) {
  const entry = profileCache.get(motherId);
  if (!entry) return null;
  if (Date.now() - entry.lastUpdated > PROFILE_CACHE_TTL_MS) {
    profileCache.delete(motherId);
    return null;
  }
  return entry;
}

type ContextDecision = {
  useProfile: boolean;
  usePrescriptions: boolean;
  useDaily: boolean;
  useDoctorQA: boolean;
};

async function decideContextNeeds(
  userMessage: string,
  isPersonal: boolean,
  hasImages: boolean,
  hasProfileContext: boolean,
  hasDaily: boolean,
  hasDoctorQA: boolean
): Promise<ContextDecision> {
  // Default/fallback decision
  const fallback: ContextDecision = {
    useProfile: isPersonal && hasProfileContext,
    usePrescriptions: hasImages,
    useDaily: isPersonal && hasDaily,
    useDoctorQA: isPersonal && hasDoctorQA,
  };

  if (!isGroqConfigured()) {
    return fallback;
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are a medical assistant. Decide which context sources to load to answer the user's question. Be efficient: include only what is likely useful.\nRespond in JSON ONLY:\n{\n  "useProfile": true/false,\n  "usePrescriptions": true/false,\n  "useDaily": true/false,\n  "useDoctorQA": true/false\n}\nGuidance:\n- If question is personal about the user and health → likely use profile.\n- If symptoms/meds/reports/prescriptions mentioned → consider prescriptions.\n- If question about habits, mood, sleep, diet, daily symptoms → consider daily.\n- If question about prior doctor advice → consider doctorQA.\n- If general/educational → usually skip.\nKeep answers short. JSON only.`,
        },
        {
          role: "user",
          content: `Question: ${userMessage}\nIs personal: ${isPersonal}\nHas images uploaded: ${hasImages}\nAvailable: profile=${hasProfileContext}, daily=${hasDaily}, doctorQA=${hasDoctorQA}\nWhich contexts should be included?`,
        },
      ],
      temperature: 0.1,
      max_tokens: 80,
    });

    const resp = completion.choices?.[0]?.message?.content?.trim() || "";
    const match = resp.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]);

    const decision: ContextDecision = {
      useProfile: !!parsed.useProfile && hasProfileContext,
      usePrescriptions: !!parsed.usePrescriptions && hasImages,
      useDaily: !!parsed.useDaily && hasDaily,
      useDoctorQA: !!parsed.useDoctorQA && hasDoctorQA,
    };

    console.log(`[Context Decision] profile=${decision.useProfile} prescriptions=${decision.usePrescriptions} daily=${decision.useDaily} doctorQA=${decision.useDoctorQA}`);
    return decision;
  } catch (err) {
    console.error("[Context Decision] AI failed, using fallback:", (err as any)?.message);
    return fallback;
  }
}

/**
 * Ask the MomsCare assistant a question with optional profile context and prescription images.
 * Completely rewritten for better accuracy, relevance, and response quality.
 */
export async function askMomsCare(
  messages: Array<{ role: string; content: string }>,
  profileContext?: string,
  prescriptionUrls?: string[],
  weeksPregnant?: number,
  isPersonal?: boolean,
  isLoggedIn?: boolean,
  extraContexts?: {
    dailyContext?: string;
    doctorQAContext?: string;
    motherId?: string;
    translatedQuery?: string; // Pre-translated query to avoid duplicate translation
  }
): Promise<string> {
  if (!isGroqConfigured()) {
    throw new Error("Groq API is not configured. Please set GROQ_API_KEY environment variable.");
  }

  try {
    const safetyPrompt = getSafetyPrompt();
    
    // ==========================================
    // STEP 1: Get last user message for processing
    // ==========================================
    const lastUserMessage = messages
      .filter((m) => m.role === "user")
      .pop()?.content || "";
    
    // ==========================================
    // STEP 2: Detect language from user message (or use forced language from config)
    // ==========================================
    const forcedLanguage = getForcedLanguage();
    const userLanguage = (forcedLanguage || detectLanguage(lastUserMessage)) as Language;
    
    // Response language instruction: Match user's input language
    const languageInstruction = userLanguage === "bn"
      ? "\n\nIMPORTANT LANGUAGE RULE: The user is writing in Bangla or Banglish. You MUST respond in Bangla (বাংলা). Use Bengali script for your entire response."
      : "\n\nIMPORTANT LANGUAGE RULE: The user is writing in English. You MUST respond in English.";
    
    // ==========================================
    // STEP 3: Search dual dataset based on language
    // ==========================================
    // For better search results: Translate Banglish to English for search
    // But always respond in the user's original language
    // ==========================================
    
    // Check if query is Banglish (romanized Bangla without Bengali script)
    const hasBengaliScript = /[\u0980-\u09FF]/.test(lastUserMessage);
    const isBanglish = userLanguage === "bn" && !hasBengaliScript;
    
    let relevantDatasetItems: any[] = [];
    let searchQuery = lastUserMessage; // Default: use original query
    
    if (isBanglish) {
      // 🎯 For Banglish: Translate to English for better search, then search with translated query
      console.log(`[Dual Search] Banglish detected: "${lastUserMessage}"`);
      
      // Use pre-translated query if available (to avoid duplicate translation)
      let translatedQuery = extraContexts?.translatedQuery;
      
      if (!translatedQuery) {
        // Only translate if not already provided
        try {
          translatedQuery = await translateToEnglish(lastUserMessage);
          console.log(`[Dual Search] Translated to English for search: "${translatedQuery}"`);
        } catch (error) {
          console.error(`[Dual Search] Translation failed, using original Banglish:`, error);
          // Fallback: use semantic search with English (works well for Banglish)
          relevantDatasetItems = await searchDatasetHybrid(lastUserMessage, "en", 3);
        }
      } else {
        console.log(`[Dual Search] Using pre-translated query: "${translatedQuery}"`);
      }
      
      if (translatedQuery) {
        searchQuery = translatedQuery; // Use translated query for search
        // Use semantic search (with keyword fallback) for better results
        relevantDatasetItems = await searchDatasetHybrid(translatedQuery, "en", 3);
      }
    } else if (userLanguage === "en") {
      // English query: Use semantic search (with keyword fallback)
      relevantDatasetItems = await searchDatasetHybrid(lastUserMessage, "en", 3);
    } else {
      // Bangla with script: Use semantic search (with keyword fallback)
      relevantDatasetItems = await searchDatasetHybrid(lastUserMessage, "bn", 3);
    }
    
    const datasetContext = relevantDatasetItems.length > 0 
      ? "\n\n" + formatDatasetContext(relevantDatasetItems, userLanguage) // Format in user's expected language
      : "";
    
    // Log language and response expectation
    console.log(`[Language] User input language: ${userLanguage} (${isBanglish ? 'Banglish' : hasBengaliScript ? 'Bangla with script' : 'English'})`);
    console.log(`[Language] Expected response language: ${userLanguage === "bn" ? "Bangla (বাংলা)" : "English"}`);
    
    // Log dataset context usage for debugging
    if (relevantDatasetItems.length > 0) {
      console.log(`[Dataset] Using ${relevantDatasetItems.length} reference Q&A for context`);
      relevantDatasetItems.forEach((item, i) => {
        const question = userLanguage === "en" ? item.question_en : item.question_bn;
        console.log(`  ${i+1}. ${question.substring(0, 80)}...`);
      });
    } else {
      console.log(`[Dataset] No relevant Q&A found - AI will use its own knowledge`);
    }
    
    // Check if image is provided
    const hasImage = prescriptionUrls && prescriptionUrls.length > 0;
    
    // ==========================================
    // AI-BASED DECISIONS
    // ==========================================
    
    // Available extra contexts (already filtered by question classifier)
    const dailyContextRaw = extraContexts?.dailyContext;
    const doctorQAContextRaw = extraContexts?.doctorQAContext;
    const motherId = extraContexts?.motherId;

    // Use provided context as-is (already filtered before calling this function)
    let actualProfileContext: string | undefined = profileContext;
    
    console.log(`[Context Usage] Profile: ${!!actualProfileContext}, Daily: ${!!dailyContextRaw}, DoctorQA: ${!!doctorQAContextRaw}, Prescriptions: ${prescriptionUrls?.length || 0}`);
    
    // Let AI naturally decide if follow-up questions are needed (no extra AI call)
    const followUpInstruction = "";
    
    // AI will intelligently detect question type - no keyword matching needed
    // The system prompt will handle understanding intent
    
    // Debug logging
    console.log(`[AI Mode] HasImage: ${hasImage}, IsPersonal: ${isPersonal}, IsLoggedIn: ${isLoggedIn}, UseProfile: ${!!actualProfileContext}`);
    
    const imageInstruction = hasImage 
      ? `\n\nCRITICAL - PRESCRIPTION/REPORT IMAGES PROVIDED: The user has ${prescriptionUrls!.length} prescription/medical report image(s) attached. You MUST analyze these images carefully and provide specific, detailed guidance based on what you see in the images. If the user asks for a summary, analyze all images and provide a comprehensive summary. If they ask about medications, dosages, test results, or any medical information, extract and explain it from the images. DO NOT say you don't have access to their prescriptions - you DO have access through these images.`
      : "";
    
    // Language-aware messages
    const greetingResponse = userLanguage === "bn"
      ? 'হাই! আমি MomsCare AI। আমি গর্ভাবস্থা এবং স্বাস্থ্য সম্পর্কিত প্রশ্নে সাহায্য করতে পারি। আপনি কী জানতে চান?'
      : 'Hi! I\'m MomsCare AI. I can help you with pregnancy and health-related questions. What would you like to know?';
    
    const thanksResponse = userLanguage === "bn"
      ? 'আপনাকে স্বাগতম! আর কোনো প্রশ্ন থাকলে জানাবেন।'
      : 'You\'re welcome! Feel free to ask if you have any more questions.';
    
    const nonHealthMessage = userLanguage === "bn" 
      ? "আমি শুধু স্বাস্থ্য এবং গর্ভাবস্থা-সম্পর্কিত প্রশ্নে সাহায্য করতে পারি। আপনার কোনো স্বাস্থ্য-সম্পর্কিত প্রশ্ন আছে?"
      : "I can only help with health and pregnancy-related questions. Do you have any health-related questions?";
    
    // System prompt - Enhanced with intelligent question understanding
    let systemPrompt = `You are MomsCare AI, a friendly and helpful pregnancy health assistant.${languageInstruction}${imageInstruction}

CRITICAL RULES:

1. HANDLE GREETINGS AND CASUAL MESSAGES:
   - For greetings (hi, hello, hey, good morning, good evening, good afternoon, good night, namaste, assalamu alaikum, হাই, নমস্কার, আসসালামু আলাইকুম, etc.):
     Respond warmly: "${greetingResponse}"
   
   - For thanks/gratitude (thanks, thank you, ধন্যবাদ, shukriya, ধন্যবাদ, etc.):
     Respond politely: "${thanksResponse}"
   
   - For casual chat (not health-related): Politely redirect to health topics
     Say: "${nonHealthMessage}"

2. UNDERSTAND QUESTION INTENT - Before answering, detect what the user wants:
   - "Which / What / ki ki / kon kon" → They want a list of specific, named items.
     → Always give clear, specific names (not categories).
     Example: "Which items?" → List specific items (e.g., Spinach, Salmon, Walking, Yoga).
   - "How / kivabe" → They want step-by-step instructions
   - "Why / keno" → They want explanations
   - "What is / ki" → They want definitions/explanations
   - "Should I / korte hobe / ki korbo" → They want advice/recommendations

3. ANSWER FORMAT - Match the format to the intent:
   - List questions → Numbered or bulleted list with specific item names
   - How-to questions → Step-by-step
   - Why/What questions → Clear explanation
   - General questions → Simple, focused answer
   - Match the detail level to the question - if they ask for a list, give a list with names

4. Answer ALL pregnancy and health questions. This includes questions with these terms:
   - Pregnancy: pregnant, pregnancy, gorbhobostha, gorvoboti, gorbhoboti, gorvo, গর্ভবতী, গর্ভাবস্থা
   - Mother: mother, ma, maa, মা, mayera, মায়েরা
   - Baby: baby, shishu, শিশু, baccha, বাচ্চা
   - Health: health, স্বাস্থ্য, sasto, swasthyo
   
5. ${actualProfileContext || dailyContextRaw || doctorQAContextRaw ? 'User data provided below with labels. Use it to answer.' : hasImage ? 'No profile data available. If user sent images, ALWAYS analyze them. For questions with "my/amar", use the images to provide personalized guidance.' : 'No personal data. Answer generally.'}

6. CRITICAL - DATASET USAGE:
   - Reference data (Q&A examples) may be provided below
   - ONLY use reference data if it's DIRECTLY RELEVANT to the user's EXACT question
   - If reference Q&A is about DIFFERENT topics (e.g. user asks about running but reference is about food), IGNORE IT COMPLETELY
   - Answer from your OWN KNOWLEDGE if reference data doesn't match
   - NEVER mix topics: If user asks about exercise, don't answer about food/nutrition
   - If user asks for a LIST and reference data doesn't have a list, use your knowledge to provide a comprehensive list

7. Emergency warnings ONLY for: heavy bleeding, severe pain, no fetal movement (20+ weeks), seizures, high fever.

8. Ask a follow-up only if absolutely necessary to give a correct answer.Otherwise answer directly.

${safetyPrompt}`;
    
    // No extra instructions needed - data speaks for itself

    // Extract weeks pregnant for RAG
    let trimester: number | undefined;
    
    if (weeksPregnant) {
      trimester = weeksPregnant;
    } else if (actualProfileContext) {
      // Try to extract weeks from profile context (new format: "সপ্তাহ: X সপ্তাহ" or old format)
      const weeksMatch = actualProfileContext.match(/সপ্তাহ:\s*(\d+)|(\d+)\s*সপ্তাহ|Weeks pregnant:\s*(\d+)|(\d+)\s*weeks/i);
      if (weeksMatch) {
        trimester = parseInt(weeksMatch[1] || weeksMatch[2] || weeksMatch[3] || weeksMatch[4], 10);
      }
    } else if (lastUserMessage) {
      const monthsMatch = lastUserMessage.match(/(\d+)\s*(?:mas|month|months|মাস)/i);
      if (monthsMatch) {
        const months = parseInt(monthsMatch[1], 10);
        trimester = Math.round(months * 4.33);
      } else {
        const weeksMatch = lastUserMessage.match(/(\d+)\s*(?:week|weeks|সপ্তাহ)/i);
        if (weeksMatch) {
          trimester = parseInt(weeksMatch[1], 10);
        }
      }
    }
    
    // Retrieve relevant medical guidelines (RAG)
    const relevantGuidelines = retrieveRelevantGuidelines(lastUserMessage, trimester, 5);
    const guidelinesContext = formatGuidelinesForContext(relevantGuidelines);
    
    // Add calculation context if question is about delivery timing
    let calculationContext = "";
    if (lastUserMessage && (lastUserMessage.toLowerCase().includes("delivery") || 
        lastUserMessage.toLowerCase().includes("deliver") || 
        lastUserMessage.toLowerCase().includes("kotodin") || 
        lastUserMessage.toLowerCase().includes("when") || 
        lastUserMessage.toLowerCase().includes("remaining") ||
        lastUserMessage.toLowerCase().includes("left"))) {
      if (trimester) {
        const weeksRemaining = Math.max(0, 40 - trimester);
        const daysRemaining = weeksRemaining * 7;
        calculationContext = `\n\nCALCULATION CONTEXT:
- Current pregnancy: ${trimester} weeks (${Math.round(trimester / 4.33)} months)
- Full-term: 40 weeks (280 days)
- Weeks remaining: ${weeksRemaining} weeks
- Days remaining: ~${daysRemaining} days
- Expected delivery: in ~${weeksRemaining} weeks

Provide this calculation FIRST, then add context.`;
      } else if (lastUserMessage.match(/(\d+)\s*(?:mas|month|months|মাস)/i)) {
        const monthsMatch = lastUserMessage.match(/(\d+)\s*(?:mas|month|months|মাস)/i);
        if (monthsMatch) {
          const months = parseInt(monthsMatch[1], 10);
          const currentWeeks = Math.round(months * 4.33);
          const weeksRemaining = Math.max(0, 40 - currentWeeks);
          const daysRemaining = weeksRemaining * 7;
          calculationContext = `\n\nCALCULATION CONTEXT:
- User mentioned: ${months} months pregnant
- This equals: ~${currentWeeks} weeks
- Full-term: 40 weeks
- Weeks remaining: ~${weeksRemaining} weeks
- Days remaining: ~${daysRemaining} days

Provide this calculation FIRST, then add context.`;
        }
      }
    }
    
    // Present ONLY filtered data - already selected by question classifier
    const profileNote = actualProfileContext ? `\n\n${actualProfileContext}` : "";
    const dailyNote = dailyContextRaw ? `\n\n${dailyContextRaw}` : "";
    const doctorQANote = doctorQAContextRaw ? `\n\n${doctorQAContextRaw}` : "";

    // Filter and format messages - only include user and assistant messages
    const filteredMessages = messages.filter((m) => m.role === "user" || m.role === "assistant");
    
    // Remove empty messages and ensure proper formatting
    const formattedMessages: any[] = [];
    
    for (let index = 0; index < filteredMessages.length; index++) {
      const m = filteredMessages[index];
      const role = (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant";
      const content = (m.content || "").trim();
      
      if (!content) continue;
      
      // If this is the last user message and we have prescription URLs, include images
      const isLastUserMessage = role === "user" && index === filteredMessages.length - 1;
      if (isLastUserMessage && prescriptionUrls && prescriptionUrls.length > 0) {
        // Determine if images are prescriptions or chat images based on context
        const hasPrescriptionFolder = prescriptionUrls.some(url => url.includes('/prescriptions/') || url.includes('prescriptions%2F'));
        const hasChatImageFolder = prescriptionUrls.some(url => url.includes('/chat-images/') || url.includes('chat-images%2F'));
        
        console.log(`[AI Message] Adding ${prescriptionUrls.length} image(s) to user message`);
        console.log(`[AI Message] Has prescription folder: ${hasPrescriptionFolder}, Has chat image folder: ${hasChatImageFolder}`);
        
        let imageContext = "";
        if (hasPrescriptionFolder && hasChatImageFolder) {
          imageContext = `\n\n🚨 CRITICAL: ${prescriptionUrls.length} PRESCRIPTION/MEDICAL REPORT IMAGE(S) ATTACHED 🚨\n\nThese are REAL images from the user's uploaded prescription and medical report files. You MUST analyze them NOW.\n\nREQUIRED ACTIONS:\n- Extract ALL medication names, dosages, frequencies, durations\n- Extract ALL test results, values, normal ranges, units\n- Extract doctor's notes, recommendations, diagnoses\n- Extract dates, patient information, clinic/hospital names\n- If user asks for summary: Provide COMPREHENSIVE summary of ALL images\n- If user asks about prescriptions/reports: Answer based on EXACT content of images\n\nDO NOT say "I don't have access" - YOU HAVE THE IMAGES BELOW. Analyze them and answer.`;
        } else if (hasPrescriptionFolder) {
          imageContext = `\n\n🚨 CRITICAL: ${prescriptionUrls.length} PRESCRIPTION/MEDICAL REPORT IMAGE(S) ATTACHED 🚨\n\nThese are REAL images from the user's uploaded prescription and medical report files. You MUST analyze them NOW.\n\nREQUIRED ACTIONS:\n- Extract ALL medication names, dosages, frequencies, durations\n- Extract ALL test results, values, normal ranges, units\n- Extract doctor's notes, recommendations, diagnoses\n- Extract dates, patient information, clinic/hospital names\n- If user asks for summary: Provide COMPREHENSIVE summary of ALL images\n- If user asks about prescriptions/reports: Answer based on EXACT content of images\n\nDO NOT say "I don't have access" - YOU HAVE THE IMAGES BELOW. Analyze them and answer.`;
        } else if (hasChatImageFolder) {
          imageContext = `\n\n[Health-related image attached. Please analyze it in context of the question.]`;
        } else {
          imageContext = `\n\n[${prescriptionUrls.length} medical image(s) attached. Please analyze them carefully.]`;
        }
        
        const textContent = content + imageContext;
        
        // Log the URLs being sent (first 3)
        console.log(`[AI Message] Sending ${prescriptionUrls.length} image URL(s) to Groq Vision API`);
        prescriptionUrls.slice(0, 3).forEach((url, idx) => {
          console.log(`[AI Message] Image ${idx + 1}: ${url.substring(0, 150)}...`);
        });
        
        formattedMessages.push({
          role: "user",
          content: [
            { 
              type: "text" as const, 
              text: textContent,
            },
            ...prescriptionUrls.slice(0, 10).map((url) => ({
              type: "image_url" as const,
              image_url: {
                url: url,
              },
            })),
          ],
        });
      } else {
        formattedMessages.push({
          role,
          content,
        });
      }
    }

    if (formattedMessages.length === 0) {
      throw new Error("No valid messages provided");
    }

    if (!groq) {
      throw new Error("Groq client is not initialized");
    }

    // Use a vision-capable model if we have images, otherwise use the 70B versatile model
    const hasImages = prescriptionUrls && prescriptionUrls.length > 0;
    const model = hasImages
      ? "meta-llama/llama-4-maverick-17b-128e-instruct" // CORRECT Groq vision model
      : "llama-3.3-70b-versatile"; // Text-only model for better accuracy
    
    console.log(`[AI Model] Using: ${model}, Images: ${hasImages ? prescriptionUrls!.length : 0}`);
    
    // CRITICAL: Log if we have images but aren't using vision model
    if (prescriptionUrls && prescriptionUrls.length > 0 && !hasImages) {
      console.error(`[AI Model] ⚠️⚠️⚠️ CRITICAL ERROR: Have ${prescriptionUrls.length} prescription URLs but hasImages is false!`);
    }
    
    // Log the actual message structure being sent
    if (hasImages) {
      const lastMessage = formattedMessages[formattedMessages.length - 1];
      if (lastMessage && Array.isArray(lastMessage.content)) {
        const imageCount = lastMessage.content.filter((item: any) => item.type === 'image_url').length;
        console.log(`[AI Model] Message structure: ${formattedMessages.length} messages, last message has ${imageCount} image(s)`);
        console.log(`[AI Model] Last message content types: ${lastMessage.content.map((item: any) => item.type).join(', ')}`);
      }
    }

    // Groq API parameters (NOTE: Groq does NOT support frequency_penalty or presence_penalty)
    // Use balanced parameters that work well for all question types
    const aiParams = {
      temperature: 0.5, // Balanced for both factual and creative responses
      max_tokens: 2400, // Enough for comprehensive lists and detailed answers
      top_p: 0.9,
    };

    // Create timeout wrapper to prevent 502/504 errors
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout - AI response took too long")), 30000); // 30 seconds
    });
    
    const completion = await Promise.race([
      groq.chat.completions.create({
        model,
        messages: [
          { 
            role: "system", 
            content: systemPrompt + profileNote + dailyNote + doctorQANote + guidelinesContext + calculationContext + datasetContext 
          },
          ...formattedMessages,
        ],
        ...aiParams,
        stop: ["\n\n\n\n"], // Stop on excessive newlines
      }),
      timeoutPromise
    ]);

    const reply = completion.choices?.[0]?.message?.content;
    if (!reply || reply.trim().length < 3) {
      throw new Error("No valid response from AI");
    }

    // Clean up the response (minimal cleaning to preserve content)
    let cleanedReply = reply.trim();
    
    // Remove common AI artifacts
    cleanedReply = cleanedReply.replace(/^(I'm|I am|As an AI|As a language model|I'm an AI).*?\.\s*/i, "");
    
    // Remove excessive newlines (keep up to 2 for formatting)
    cleanedReply = cleanedReply.replace(/\n{4,}/g, "\n\n");
    
    // Remove EXACT duplicate consecutive sentences (light deduplication)
    const lines = cleanedReply.split('\n');
    const dedupedLines: string[] = [];
    let lastLine = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Only skip if EXACTLY the same as previous line
      if (trimmedLine !== lastLine) {
        dedupedLines.push(line);
        lastLine = trimmedLine;
      }
    }
    cleanedReply = dedupedLines.join('\n');
    
    // Final minimal cleanup
    cleanedReply = cleanedReply.replace(/\s+\n/g, "\n"); // Remove trailing spaces before newlines
    cleanedReply = cleanedReply.replace(/\n\s+/g, "\n"); // Remove leading spaces after newlines
    cleanedReply = cleanedReply.replace(/\.\s*\./g, "."); // Remove double periods
    cleanedReply = cleanedReply.trim();
    
    // Log response language for verification
    const responseLanguage = detectLanguage(cleanedReply);
    console.log(`[Response] Generated response language: ${responseLanguage} (expected: ${userLanguage})`);
    console.log(`[Response] Response preview: "${cleanedReply.substring(0, 100)}..."`);
    
    return cleanedReply;
  } catch (error: any) {
    console.error("Groq API error:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
    });
    
    // Provide more specific error messages
    if (error.message?.includes("rate limit") || error.status === 429) {
      throw new Error("Service is busy. Please try again in a moment.");
    }
    if (error.message?.includes("token") || error.message?.includes("length") || error.status === 400) {
      throw new Error("Message is too long. Please shorten your question.");
    }
    if (error.message?.includes("API") || error.message?.includes("key") || error.status === 401) {
      throw new Error("API configuration issue. Please contact support.");
    }
    if (error.message?.includes("model") || error.status === 404) {
      throw new Error("Model not available. Please try again later.");
    }
    
    // Re-throw with original message if it's informative
    if (error.message && error.message.length > 10) {
      throw error;
    }
    
    throw new Error(
      error.message || "Failed to get response from AI. Please try again."
    );
  }
}
