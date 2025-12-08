import { groq, isGroqConfigured } from "./groqClient";
import { retrieveRelevantGuidelines, formatGuidelinesForContext } from "./medicalKnowledge";
import { searchDatasetByLanguage, formatDatasetContext, type Language } from "./dualDatasetLoader";
import { detectLanguage, translateToEnglish } from "./translation";
import { getForcedLanguage } from "./datasetConfig";
import { classifyQuestion, needsFollowUpQuestion } from "./chat/QuestionClassifier";
import { buildSystemPrompt, type PromptContext } from "./chat/SystemPromptBuilder";
import { validateAndCleanResponse } from "./chat/ResponseValidator";
import { detectIntent, generateFollowUpQuestion } from "./chat/IntentDetector";
import { handleSimpleQuery, ensureQuestionMarks } from "./chat/SimpleResponseHandler";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

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
): Promise<string> {
  if (!isGroqConfigured()) {
    throw new Error("Groq API is not configured. Please set GROQ_API_KEY environment variable.");
  }

  try {
    // Determine if user has profile data
    const hasProfile = !!(profileContext && profileContext.trim().length > 0);
    const userIsLoggedIn = isLoggedIn ?? hasProfile;
    
    // ==========================================
    // STEP 1: Get last user message for processing
    // ==========================================
    const lastUserMessage = messages
      .filter((m) => m.role === "user")
      .pop()?.content || "";
    
    // ==========================================
    // STEP 2: Quick intent detection FIRST (before expensive operations)
    // This prevents logged-out users from triggering profile operations
    // ==========================================
    const quickIntent = detectIntent(lastUserMessage, userIsLoggedIn);
    
    // ==========================================
    // STEP 3: Detect language from user message (or use forced language from config)
    // ==========================================
    const forcedLanguage = getForcedLanguage();
    const userLanguage = (forcedLanguage || detectLanguage(lastUserMessage)) as Language;
    
    // ==========================================
    // STEP 4: Handle SIMPLE queries instantly (NO API calls for speed)
    // ==========================================
    const simpleResponse = handleSimpleQuery(lastUserMessage, userIsLoggedIn, userLanguage);
    if (simpleResponse.handled) {
      console.log('[SimpleHandler] Instant response - no AI API calls needed');
      return simpleResponse.response!; // Already properly formatted
    }
    
    // ==========================================
    // STEP 5: Handle follow-up questions that need clarification
    // ==========================================
    if (quickIntent.needsFollowUp) {
      const followUp = generateFollowUpQuestion(lastUserMessage, quickIntent);
      if (followUp) {
        console.log('[FollowUp] Asking for clarification');
        return followUp; // Already has proper ? marks
      }
    }
    
    // ==========================================
    // STEP 6: Search dual dataset based on language
    // OPTIMIZATION: Skip expensive translation for logged-out users or profile queries
    // ==========================================
    const hasBengaliScript = /[\u0980-\u09FF]/.test(lastUserMessage);
    const isBanglish = userLanguage === "bn" && !hasBengaliScript;
    
    let searchQuery = lastUserMessage;
    let relevantDatasetItems: any[] = [];
    
    // SMART TRANSLATION: Skip for logged-out users (prevent crashes)
    const shouldTranslate = isBanglish && userIsLoggedIn && quickIntent.intent !== 'ask_profile_info' && quickIntent.intent !== 'ask_general_info';
    
    if (shouldTranslate) {
      try {
        console.log(`[Banglish] Translating for personalized query...`);
        const translatedQuery = await translateToEnglish(lastUserMessage);
        searchQuery = translatedQuery || lastUserMessage;
        console.log(`[Banglish] Translated: ${searchQuery}`);
        relevantDatasetItems = searchDatasetByLanguage(searchQuery, "en", 2);
      } catch (error) {
        console.warn("Banglish translation failed, using direct search:", error);
        // Fallback: direct search without translation
        relevantDatasetItems = searchDatasetByLanguage(lastUserMessage, "en", 2);
      }
    } else {
      // Direct search (faster, no API call needed)
      // For Banglish, try English first as many keywords match
      const numResults = quickIntent.intent === 'ask_profile_info' ? 1 : 2;
      const searchLang = isBanglish ? "en" : userLanguage;
      
      try {
        relevantDatasetItems = searchDatasetByLanguage(lastUserMessage, searchLang, numResults);
        console.log(`[Dataset] Direct search in ${searchLang}: ${relevantDatasetItems.length} results`);
        
        // If no results and it's Banglish, try Bangla too
        if (relevantDatasetItems.length === 0 && isBanglish) {
          relevantDatasetItems = searchDatasetByLanguage(lastUserMessage, "bn", numResults);
          console.log(`[Dataset] Fallback search in bn: ${relevantDatasetItems.length} results`);
        }
      } catch (error) {
        console.error("Dataset search error:", error);
        relevantDatasetItems = []; // Continue without dataset context
      }
    }
    
    const datasetContext = relevantDatasetItems.length > 0 
      ? "\n\n" + formatDatasetContext(relevantDatasetItems, userLanguage) // Format in user's expected language
      : "";
    
    // Use the quick intent we already detected
    const intent = quickIntent;
    
    console.log(`[Intent Detection]`, {
      intent: intent.intent,
      confidence: intent.confidence,
      reason: intent.reason,
      shouldShowProfile: intent.shouldShowProfile,
      shouldShowPrescription: intent.shouldShowPrescription
    });
    
    // Use modular question classifier for remaining logic
    const classification = classifyQuestion(lastUserMessage, userIsLoggedIn);
    const isGeneralQuestion = classification.type === 'general' || intent.intent === 'ask_general_info';
    const isPersonalQuestion = classification.type === 'personal' && intent.intent !== 'ask_general_info';
    
    // Build system prompt using modular builder
    const promptContext: PromptContext = {
      isLoggedIn: userIsLoggedIn,
      hasProfile,
      isGeneralQuestion,
      isPersonalQuestion,
      language: userLanguage,
      needsFollowUp: false  // Already handled above
    };
    
    let systemPrompt = buildSystemPrompt(promptContext);
    
    // Add intent-specific instructions
    if (intent.intent === 'ask_profile_info') {
      systemPrompt += `\n\n**INTENT: User asking for SPECIFIC profile information only.**
- Answer ONLY what they asked (age, blood group, pregnancy duration, etc.)
- DO NOT add prescriptions, medical advice, or warnings
- Keep answer SHORT and DIRECT
- Example: Q: "amar boyos?" A: "আপনার বয়স ৩০ বছর।" (STOP HERE)`;
    }
    
    if (intent.intent === 'ask_prescription') {
      systemPrompt += `\n\n**INTENT: User explicitly asking for prescription details.**
- NOW you CAN show prescription details
- List all medicines with dosages
- Provide clear instructions`;
    }
    
    if (!intent.shouldShowPrescription && intent.shouldShowProfile) {
      systemPrompt += `\n\n**CRITICAL: DO NOT show prescription details.**
- User asked a medical question but did NOT ask for prescriptions
- Use prescription data internally if needed
- But DO NOT list medicines in your response`;
    }

    // Extract weeks pregnant for RAG
    let trimester: number | undefined;
    
    if (weeksPregnant) {
      trimester = weeksPregnant;
    } else if (profileContext) {
      // Try to extract weeks from profile context (new format: "সপ্তাহ: X সপ্তাহ" or old format)
      const weeksMatch = profileContext.match(/সপ্তাহ:\s*(\d+)|(\d+)\s*সপ্তাহ|Weeks pregnant:\s*(\d+)|(\d+)\s*weeks/i);
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
    
    // Use intent-based decision for profile context
    let profileNote = "";
    
    if (profileContext && intent.shouldShowProfile) {
      // For specific profile info requests, extract only what they asked
      if (intent.intent === 'ask_profile_info') {
        const lower = lastUserMessage.toLowerCase();
        
        if (/boyos|age/.test(lower)) {
          // Extract only age
          const ageMatch = profileContext.match(/বয়স:\s*(\d+)/);
          if (ageMatch) {
            profileNote = `\n\nUSER AGE: ${ageMatch[1]} years`;
          }
        }
        
        if (/rokter group|blood group/.test(lower)) {
          // Extract only blood group
          const bgMatch = profileContext.match(/রক্তের গ্রুপ:\s*([A-Z+\-]+)/);
          if (bgMatch) {
            profileNote += `\n\nUSER BLOOD GROUP: ${bgMatch[1]}`;
          }
        }
        
        if (/pregnancy.*kotodin|koto mas/.test(lower)) {
          // Extract only pregnancy duration
          const weekMatch = profileContext.match(/সপ্তাহ:\s*(\d+)/);
          if (weekMatch) {
            profileNote += `\n\nPREGNANCY DURATION: ${weekMatch[1]} weeks`;
          }
        }
        
        // If nothing matched, include minimal profile
        if (!profileNote && profileContext) {
          profileNote = `\n\n${profileContext}`;
        }
      } else {
        // For medical advice, include full profile but mark prescription as DO NOT SHOW
        profileNote = `\n\n${profileContext}\n\n**IMPORTANT: User did NOT ask for prescription details. DO NOT list medicines unless specifically asked.**`;
      }
      
      console.log("[MomsCare] Profile context INCLUDED (intent-based)");
    } else if (profileContext && isGeneralQuestion) {
      console.log("[MomsCare] GENERAL question - profile context EXCLUDED");
    } else {
      console.log("[MomsCare] No profile context needed for this query");
    }

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
        const textContent = content + (prescriptionUrls.length > 0 
          ? `\n\nI have ${prescriptionUrls.length} prescription(s) uploaded. Please analyze them and provide recommendations based on my pregnancy profile.` 
          : "");
        
        formattedMessages.push({
          role: "user",
          content: [
            { 
              type: "text" as const, 
              text: textContent,
            },
            ...prescriptionUrls.slice(0, 3).map((url) => ({
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

    // Smart model selection based on query complexity
    let model: string;
    
    if (prescriptionUrls && prescriptionUrls.length > 0) {
      // Use vision model for image analysis
      model = "meta-llama/llama-4-scout-17b-16e-instruct";
    } else if (quickIntent.intent === 'ask_profile_info') {
      // Use faster model for simple profile queries
      model = "llama-3.1-8b-instant"; // 10x faster for simple queries
    } else if (isGeneralQuestion) {
      // Use medium model for general questions
      model = "llama-3.1-70b-versatile";
    } else {
      // Use best model for complex medical advice
      model = "llama-3.3-70b-versatile";
    }
    
    console.log(`[Model Selection] Using ${model} for intent: ${quickIntent.intent}`);

    // Create timeout wrapper to prevent 502 errors (shorter for simple queries)
    const timeoutDuration = quickIntent.intent === 'ask_profile_info'
      ? 15000  // 15 seconds for simple queries
      : 45000; // 45 seconds for complex queries
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout - AI response took too long")), timeoutDuration);
    });
    
    const completion = await Promise.race([
      groq.chat.completions.create({
        model,
        messages: [
          { 
            role: "system", 
            content: systemPrompt + profileNote + guidelinesContext + calculationContext + datasetContext 
          },
          ...formattedMessages,
        ],
        // Dynamic parameters based on query type
        temperature: quickIntent.intent === 'ask_profile_info' ? 0.1 : 0.3, // Very low for factual queries
        max_tokens: quickIntent.intent === 'ask_profile_info' ? 500 :  // Short for profile info
                   quickIntent.intent === 'ask_general_info' ? 1500 :  // Medium for general
                   3000, // Longer for medical advice
        top_p: 0.85,
        frequency_penalty: 0.4,
        presence_penalty: 0.3,
        stop: ["\n\n\n\n", "====", "----", "আপনার প্রেসক্রিপশন"], // Stop if starting to list prescriptions
      }),
      timeoutPromise
    ]);

    const reply = completion.choices?.[0]?.message?.content;
    if (!reply || reply.trim().length < 3) {
      throw new Error("No valid response from AI");
    }

    // Clean up the response
    let cleanedReply = reply.trim();
    
    // Remove common AI artifacts
    cleanedReply = cleanedReply.replace(/^(I'm|I am|As an AI|As a language model|I'm an AI).*?\.\s*/i, "");
    cleanedReply = cleanedReply.replace(/\n{3,}/g, "\n\n"); // Remove excessive newlines
    
    // Remove repetitive or meaningless sentences
    // Split into sentences and filter out duplicates or very similar sentences
    const sentences = cleanedReply.split(/[.!?]\s+/).filter(s => s.trim().length > 10);
    const uniqueSentences: string[] = [];
    const seen = new Set<string>();
    
    for (const sentence of sentences) {
      const normalized = sentence.toLowerCase().trim();
      // Skip if very similar to a previous sentence (simple check)
      let isDuplicate = false;
      for (const seenSentence of seen) {
        // Check if sentences are very similar (more than 80% word overlap)
        const words1 = normalized.split(/\s+/);
        const words2 = seenSentence.split(/\s+/);
        const commonWords = words1.filter(w => words2.includes(w));
        const similarity = commonWords.length / Math.max(words1.length, words2.length);
        if (similarity > 0.8) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate && normalized.length > 10) {
        uniqueSentences.push(sentence.trim());
        seen.add(normalized);
      }
    }
    
    // Rejoin sentences, preserving the structure
    if (uniqueSentences.length > 0) {
      cleanedReply = uniqueSentences.join(". ") + (cleanedReply.endsWith(".") ? "" : ".");
    }
    
    // Final cleanup
    cleanedReply = cleanedReply.replace(/\s+/g, " "); // Remove extra spaces
    cleanedReply = cleanedReply.replace(/\.\s*\./g, "."); // Remove double periods
    cleanedReply = cleanedReply.trim();
    
    // Apply modular validation and cleaning (intent-aware)
    const validation = validateAndCleanResponse(
      cleanedReply, 
      lastUserMessage, 
      isGeneralQuestion,
      intent.shouldShowPrescription
    );
    
    if (validation.issues.length > 0) {
      console.log("[Response Validation] Issues fixed:", validation.issues);
    }
    
    // FINAL STEP: Ensure all questions have question marks
    const finalResponse = ensureQuestionMarks(validation.cleaned);
    
    return finalResponse;
  } catch (error: any) {
    console.error("MomsCare AI error:", error);
    console.error("Error context:", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      errorStack: error.stack?.substring(0, 200)
    });
    
    // Detect language for error messages from the last message if available
    const lastMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const isBangla = /[\u0980-\u09FF]/.test(lastMsg) || /amar|ami|ki|kemon/.test(lastMsg.toLowerCase());
    
    // Provide more specific error messages
    if (error.message?.includes("rate limit") || error.status === 429) {
      const msg = isBangla 
        ? "সার্ভিস ব্যস্ত আছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
        : "Service is busy. Please try again in a moment.";
      throw new Error(msg);
    }
    
    if (error.message?.includes("token") || error.message?.includes("length") || error.status === 400) {
      const msg = isBangla
        ? "প্রশ্নটি খুব বড়। অনুগ্রহ করে ছোট করুন।"
        : "Message is too long. Please shorten your question.";
      throw new Error(msg);
    }
    
    if (error.message?.includes("API") || error.message?.includes("key") || error.status === 401 || error.status === 403) {
      const msg = isBangla
        ? "সার্ভিস কনফিগারেশন সমস্যা। সাপোর্টে যোগাযোগ করুন।"
        : "Service configuration error. Please contact support.";
      throw new Error(msg);
    }
    
    if (error.message?.includes("model") || error.status === 404) {
      const msg = isBangla
        ? "মডেল উপলব্ধ নেই। পরে আবার চেষ্টা করুন।"
        : "Model not available. Please try again later.";
      throw new Error(msg);
    }
    
    if (error.message?.includes("timeout") || error.message?.includes("Request timeout")) {
      const msg = isBangla
        ? "রেসপন্স পেতে দেরি হচ্ছে। ছোট প্রশ্ন করুন।"
        : "Response took too long. Please try a shorter question.";
      throw new Error(msg);
    }
    
    // Check for profile/context errors (logged-out users)
    if (error.message?.includes("profile") || error.message?.includes("undefined") || error.message?.includes("null")) {
      console.error("[Critical] Possible data access error - logged-out user or missing profile");
      const msg = isBangla
        ? "দুঃখিত, আমি এই প্রশ্নের উত্তর দিতে পারছি না। আরও সাধারণ প্রশ্ন করুন।"
        : "Sorry, I cannot answer this question. Please ask a more general question.";
      throw new Error(msg);
    }
    
    // Generic fallback with language support
    const fallbackMessage = isBangla
      ? "দুঃখিত, একটি সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
      : "Sorry, something went wrong. Please try again in a moment.";
    
    throw new Error(fallbackMessage);
  }
}
