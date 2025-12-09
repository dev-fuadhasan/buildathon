import { groq, isGroqConfigured } from "./groqClient";
import { getSafetyPrompt } from "./safetyGuardrails";
import { retrieveRelevantGuidelines, formatGuidelinesForContext } from "./medicalKnowledge";
import { searchDatasetByLanguage, formatDatasetContext, type Language } from "./dualDatasetLoader";
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
    const languageInstruction = userLanguage === "bn"
      ? "\n\nIMPORTANT LANGUAGE RULE: The user is writing in Bangla or Banglish. You MUST respond in Bangla (বাংলা). Use Bengali script for your entire response."
      : "\n\nIMPORTANT LANGUAGE RULE: The user is writing in English. You MUST respond in English.";
    
    // ==========================================
    // STEP 3: Search dual dataset based on language
    // ==========================================
    // Check if query is Banglish (romanized Bangla without Bengali script)
    const hasBengaliScript = /[\u0980-\u09FF]/.test(lastUserMessage);
    const isBanglish = userLanguage === "bn" && !hasBengaliScript;
    
    // For Banglish queries, translate to English first for better search
    let searchQuery = lastUserMessage;
    let relevantDatasetItems;
    
    if (isBanglish) {
      try {
        // Translate Banglish to English for accurate dataset search
        const translatedQuery = await translateToEnglish(lastUserMessage);
        searchQuery = translatedQuery || lastUserMessage;
        console.log(`[Banglish] Original: ${lastUserMessage}`);
        console.log(`[Banglish] Translated: ${searchQuery}`);
        // Search English dataset with translated query
        relevantDatasetItems = searchDatasetByLanguage(searchQuery, "en", 3);
      } catch (error) {
        console.error("Banglish translation failed, fallback to direct search:", error);
        // Fallback: search both datasets
        const enResults = searchDatasetByLanguage(lastUserMessage, "en", 3);
        const bnResults = searchDatasetByLanguage(lastUserMessage, "bn", 3);
        relevantDatasetItems = enResults.length > 0 ? enResults : bnResults;
      }
    } else {
      // Normal search for English or Bangla with script
      relevantDatasetItems = searchDatasetByLanguage(searchQuery, userLanguage, 3);
    }
    
    const datasetContext = relevantDatasetItems.length > 0 
      ? "\n\n" + formatDatasetContext(relevantDatasetItems, userLanguage) // Format in user's expected language
      : "";
    
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
    
    // Check if question needs comprehensive answer (more selective criteria)
    const needsComprehensive = lastUserMessage.toLowerCase().includes("ki ki ") || 
                               lastUserMessage.toLowerCase().includes("what things") ||
                               lastUserMessage.toLowerCase().includes("what are the") ||
                               lastUserMessage.toLowerCase().includes("list of") ||
                               lastUserMessage.toLowerCase().includes("tips for") ||
                               lastUserMessage.toLowerCase().includes("guidelines for") ||
                               lastUserMessage.toLowerCase().includes("mene colbe") ||
                               lastUserMessage.toLowerCase().includes("mene chole");
    
    // Dynamic answer length instruction
    const answerLengthInstruction = needsComprehensive
      ? "Provide a COMPREHENSIVE answer with clear points or bullet list when needed. For 'what things' or 'ki ki' questions, list ALL relevant items."
      : "Keep answers concise but complete. For simple questions, give short answers. For complex topics, provide adequate details.";
    
    // Debug logging
    console.log(`[AI Mode] Comprehensive: ${needsComprehensive}, HasImage: ${hasImage}, IsPersonal: ${isPersonal}, IsLoggedIn: ${isLoggedIn}, UseProfile: ${!!actualProfileContext}`);
    
    const imageInstruction = hasImage 
      ? "\n\nIMAGE PROVIDED: The user has sent an image (prescription, medical report, or health-related photo). Analyze it carefully and provide specific guidance based on what you see in the image combined with their question/message."
      : "";
    
    // System prompt - ULTRA SIMPLIFIED for maximum accuracy
    let systemPrompt = `You are MomsCare AI, a pregnancy health assistant.${languageInstruction}${imageInstruction}

RULES:
1. Answer ALL pregnancy and health questions. This includes questions with these terms:
   - Pregnancy: pregnant, pregnancy, gorbhobostha, gorvoboti, gorbhoboti, gorvo, গর্ভবতী, গর্ভাবস্থা
   - Mother: mother, ma, maa, মা, mayera, মায়েরা
   - Baby: baby, shishu, শিশু, baccha, বাচ্চা
   - Health: health, স্বাস্থ্য, sasto, swasthyo
   
   Non-health (greetings, casual chat) → say: "আমি শুধু স্বাস্থ্য এবং গর্ভাবস্থা-সম্পর্কিত প্রশ্নে সাহায্য করতে পারি।"

2. ${actualProfileContext || dailyContextRaw || doctorQAContextRaw ? 'User data provided below with labels. Use it to answer.' : 'No personal data. Answer generally.'}

3. Emergency warnings ONLY for: heavy bleeding, severe pain, no fetal movement (20+ weeks), seizures, high fever.

4. ${answerLengthInstruction}

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
        const hasPrescriptionFolder = prescriptionUrls.some(url => url.includes('/prescriptions/'));
        const hasChatImageFolder = prescriptionUrls.some(url => url.includes('/chat-images/'));
        
        let imageContext = "";
        if (hasPrescriptionFolder && hasChatImageFolder) {
          imageContext = `\n\n[${prescriptionUrls.length} image(s) attached: prescriptions and/or health-related photos. Please analyze them carefully.]`;
        } else if (hasPrescriptionFolder) {
          imageContext = `\n\n[${prescriptionUrls.length} prescription/medical report(s) attached. Please analyze and provide guidance.]`;
        } else if (hasChatImageFolder) {
          imageContext = `\n\n[Health-related image attached. Please analyze it in context of the question.]`;
        } else {
          imageContext = `\n\n[${prescriptionUrls.length} medical image(s) attached.]`;
        }
        
        const textContent = content + imageContext;
        
        formattedMessages.push({
          role: "user",
          content: [
            { 
              type: "text" as const, 
              text: textContent,
            },
            ...prescriptionUrls.slice(0, 5).map((url) => ({
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

    // Groq API parameters (NOTE: Groq does NOT support frequency_penalty or presence_penalty)
    const aiParams = needsComprehensive ? {
      temperature: 0.5,
      max_tokens: 2600, // further reduce latency
      top_p: 0.9,
    } : {
      temperature: 0.4,
      max_tokens: 1800, // further reduce latency
      top_p: 0.85,
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
        stop: needsComprehensive ? null : ["\n\n\n\n"],
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
    
    // Only remove EXACT duplicate consecutive sentences (not similar ones)
    if (!needsComprehensive) {
      // For non-comprehensive answers, do light deduplication
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
    }
    
    // Final minimal cleanup
    cleanedReply = cleanedReply.replace(/\s+\n/g, "\n"); // Remove trailing spaces before newlines
    cleanedReply = cleanedReply.replace(/\n\s+/g, "\n"); // Remove leading spaces after newlines
    cleanedReply = cleanedReply.replace(/\.\s*\./g, "."); // Remove double periods
    cleanedReply = cleanedReply.trim();
    
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
