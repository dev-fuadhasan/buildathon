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
    
    // Decision 1: Should we use profile data? (Only for logged-in users)
    let actualProfileContext: string | undefined = undefined;
    if (isLoggedIn && profileContext) {
      const useProfile = await shouldUseProfileData(lastUserMessage, profileContext);
      if (useProfile) {
        actualProfileContext = profileContext;
        console.log(`[AI Decision] Using profile data for personalized answer`);
      } else {
        console.log(`[AI Decision] NOT using profile data - question is general/educational`);
      }
    }
    
    // Decision 2: Are follow-up questions needed?
    const followUpDecision = await needsFollowUpQuestions(lastUserMessage, isPersonal || false, messages);
    const followUpInstruction = followUpDecision.needsFollowUp && followUpDecision.questions.length > 0
      ? `\n\nFOLLOW-UP QUESTIONS NEEDED: After your main answer, ask these follow-up questions naturally in the conversation:\n${followUpDecision.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nAsk these questions in a conversational way, not as a list.`
      : "";
    
    if (followUpDecision.needsFollowUp) {
      console.log(`[AI Decision] Follow-up questions needed: ${followUpDecision.questions.length}`);
    }
    
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
    
    // System prompt - MomsCare AI
    let systemPrompt = `You are MomsCare AI. Follow these strict rules:${languageInstruction}${imageInstruction}${followUpInstruction}

1. Only answer health, pregnancy, symptoms, medicine, reports, or well-being questions.

   If the message is not health related, reply: "আমি শুধু স্বাস্থ্য এবং গর্ভাবস্থা-সম্পর্কিত প্রশ্নে সাহায্য করতে পারি।"

2. Logged-out user: you have no personal data. Do not mention this unless the user directly asks.

3. Logged-in user: ${actualProfileContext ? 'Profile data is provided below. Use it to personalize your answer.' : 'No profile data needed for this question. Answer generally.'}

4. A question is health-related if it mentions pregnancy, symptoms, pain, medicine, journey safety, daily habits, or mother/baby well-being.

5. Do NOT give emergency warnings unless the user clearly mentions one of these:

   heavy bleeding, severe abdominal pain, vomiting >24h without fluids, fainting, no fetal movement (20+ weeks), very high BP, seizures etc.

6. ${answerLengthInstruction}

7. Do not assume anything not said by the user. Do not invent symptoms.

8. If the message is emotional, casual, or unrelated to health, respond politely and neutral without adding pregnancy context.

9. For list-based questions (ki ki, what things, what should, etc.), provide a well-organized list with brief explanations.

10. WHEN TO SUGGEST IMAGE UPLOAD: If user asks about symptoms, pain, reports, prescriptions, or anything that could benefit from visual inspection, politely suggest they can upload an image for more accurate guidance. Say: "আপনি যদি কোনো প্রেসক্রিপশন, রিপোর্ট বা সংশ্লিষ্ট ছবি আপলোড করেন তাহলে আমি আরো সঠিক পরামর্শ দিতে পারব।" (Bangla) or "You can upload any prescription, report, or related image for more accurate guidance." (English)

Goal: Provide helpful, accurate health guidance.

${safetyPrompt}`;
    
    // Add specific instruction for current question type
    if (isLoggedIn) {
      if (actualProfileContext) {
        systemPrompt += `\n\nCURRENT: Logged-in user, personal question. Profile data provided below - use it for personalized guidance.`;
      } else {
        systemPrompt += `\n\nCURRENT: Logged-in user, general/educational question. Answer generally without using profile data.`;
      }
    } else {
      systemPrompt += `\n\nCURRENT: Logged-out user. No personal information. Do not mention this unless directly asked. Answer questions directly.`;
    }

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
    
    const profileNote = actualProfileContext
      ? `\n\n${actualProfileContext}`
      : "";

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
      temperature: 0.6,
      max_tokens: 6000,
      top_p: 0.9,
    } : {
      temperature: 0.5,
      max_tokens: 4000,
      top_p: 0.85,
    };

    // Create timeout wrapper to prevent 502 errors
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout - AI response took too long")), 55000); // 55 seconds
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
