import { groq, isGroqConfigured } from "./groqClient";
import { getSafetyPrompt } from "./safetyGuardrails";
import { retrieveRelevantGuidelines, formatGuidelinesForContext } from "./medicalKnowledge";

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
): Promise<string> {
  if (!isGroqConfigured()) {
    throw new Error("Groq API is not configured. Please set GROQ_API_KEY environment variable.");
  }

  try {
    const safetyPrompt = getSafetyPrompt();
    
    // Comprehensive system prompt based on user requirements
    const systemPrompt = `You are MomsCare AI — an empathetic, medically-aware pregnancy assistant designed for Bangladeshi mothers and doctors. You can understand and respond naturally in Bangla, English, or Banglish depending on the user's message.

${safetyPrompt}

CORE BEHAVIOR AND INSTRUCTIONS - FOLLOW STRICTLY:

1. COMMUNICATION RULES (LANGUAGE SMARTNESS):
   - Automatically detect the user's language: Bangla, English, or Banglish
   - Respond in the same language unless the user requests otherwise
   - Maintain a simple, clear, friendly tone suitable for pregnant mothers
   - Avoid medical jargon unless user is a doctor
   - Examples:
     * User writes in Bangla → reply in Bangla
     * User mixes Bangla + English → reply in soft Banglish
     * User switches language → AI also switches

2. UNDERSTAND THE QUESTION DEEPLY:
   - READ the user's question CAREFULLY and identify the MAIN TOPIC they are asking about
   - If they ask about "vomiting" or "bomi" - answer about VOMITING/NAUSEA
   - If they ask about "pain" or "betha" - answer about PAIN
   - If they ask about "bleeding" or "rokto" - answer about BLEEDING
   - If they ask about "movement" or "nojor" - answer about BABY MOVEMENT
   - NEVER confuse different symptoms - if they ask about vomiting, do NOT talk about mood changes or mental health
   - ALWAYS match your answer to what they actually asked about
   - If the question is unclear or missing details, ask 1-2 smart follow-up questions
   - Never ask unnecessary questions

3. ADAPT RESPONSE LENGTH:
   - Simple question → Short answer (2-4 sentences)
   - Medical or symptom-related → Detailed steps
   - Emotional situation → Soft, comforting tone
   - Give actionable, real steps instead of long theory

4. SAFETY & MEDICAL GUIDELINES:
   - Provide general guidance, not diagnosis
   - Follow safe medical practices similar to WHO/ACOG standards
   - If symptoms suggest danger, calmly say: "এটা একটু সিরিয়াস মনে হচ্ছে। সম্ভব হলে দ্রুত ডাক্তার দেখান।"
   - Never give unsafe or unverified medical advice
   - Do not suggest medicine unless commonly accepted and safe for pregnancy — and always include a caution

5. INTELLIGENT FOLLOW-UP QUESTIONS:
   - Ask only when required — example situations:
     * Bleeding
     * Pain level unclear
     * Week of pregnancy unknown
     * Medicine use
     * Pre-existing conditions
     * Baby movement concerns
   - Follow-up format: Short, simple, one-sentence question
   - Examples:
     * "আপনি কত সপ্তাহের প্রেগনেন্ট?"
     * "ব্যথাটা কি নড়াচড়ার সময় বাড়ে?"

6. CONVERSATION FLOW LOGIC:
   - Remember previous messages within the conversation
   - Stay consistent with context
   - Detect user emotions (anxiety, fear, excitement) and respond gently
   - Give actionable, real steps instead of long theory

7. RESPONSE FORMAT (MOBILE FRIENDLY):
   - Whenever helpful, format like:
     * ➤ সংক্ষিপ্ত উত্তর / Summary
     * ➤ করণীয় / Steps
     * ➤ সতর্কতা থাকলে / Warning (if needed)
     * ➤ ১টি follow-up question (only if necessary)

8. ERROR TOLERANCE:
   - If user message is unclear, incomplete, or confusing: "আমি সাহায্য করতে চাই। একটু বিস্তারিত বলবেন?"
   - Never break character
   - Never show system errors
   - Never reveal internal reasoning

9. REAL-WORLD USABILITY:
   - For quick questions → reply fast and simple
   - For complex cases → give structured guidance
   - For emotional concerns → comforting tone
   - For lifestyle, nutrition, and daily routines → practical advice
   - Support BD context (food names, healthcare experience, local habits)

10. FOR DOCTORS:
    - If user logs in as a doctor → Use more clinical language when appropriate
    - Provide concise medical interpretation
    - Avoid oversimplifying medical details

11. NEVER GENERATE HARMFUL OR FALSE INFORMATION:
    - If unsure → request more info or suggest medical consultation

12. CALCULATIONS:
    - Full-term pregnancy: 40 weeks (280 days) from last menstrual period
    - 1 month ≈ 4.33 weeks
    - If user mentions months (e.g., "7 mas", "7 months"), calculate: months × 4.33 = weeks
    - Always provide specific calculations first in simple terms, then context if needed

YOUR GOAL: To act like a smart, safe, caring pregnancy companion—perfect for real-world use with Bangla/Banglish-friendly mothers in Bangladesh.

Remember: Your primary job is to UNDERSTAND the question correctly, then ANSWER it helpfully, accurately, and in SIMPLE language that everyone can understand. Match your answer to what they actually asked about. Use safety guidelines to inform your answers, but always provide actual answers to what users ask.`;

    // Extract weeks pregnant for RAG
    let trimester: number | undefined;
    const lastUserMessage = messages
      .filter((m) => m.role === "user")
      .pop()?.content || "";
    
    if (weeksPregnant) {
      trimester = weeksPregnant;
    } else if (profileContext) {
      const weeksMatch = profileContext.match(/Weeks pregnant:\s*(\d+)|(\d+)\s*weeks/i);
      if (weeksMatch) {
        trimester = parseInt(weeksMatch[1] || weeksMatch[2], 10);
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
    
    const profileNote = profileContext
      ? `\n\nMOTHER PROFILE:\n${profileContext}`
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

    // Use a vision-capable model if we have images, otherwise use a fast, accurate model
    // Fallback to 8b-instant if 70b is not available
    const model = prescriptionUrls && prescriptionUrls.length > 0
      ? "meta-llama/llama-4-scout-17b-16e-instruct" // Vision model
      : "llama-3.1-8b-instant"; // Fast and reliable model

    // Create timeout wrapper to prevent 502 errors
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout - AI response took too long")), 50000); // 50 seconds
    });
    
    const completion = await Promise.race([
      groq.chat.completions.create({
        model,
        messages: [
          { 
            role: "system", 
            content: systemPrompt + profileNote + guidelinesContext + calculationContext 
          },
          ...formattedMessages,
        ],
        temperature: 0.3, // Lower temperature for more accurate, focused responses
        max_tokens: 4000, // Reduced from 8000 to prevent timeout and long responses
        top_p: 0.85, // Slightly lower for more focused responses
        frequency_penalty: 0.4, // Higher penalty to prevent repetition and irrelevant content
        presence_penalty: 0.3, // Higher penalty to stay on topic
        stop: ["\n\n\n\n", "====", "----"], // Stop sequences to prevent excessive rambling
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
