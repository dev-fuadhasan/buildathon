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
    
    // Improved system prompt with better structure and clarity
    const systemPrompt = `You are MomsCare, a helpful and knowledgeable AI assistant specializing in pregnancy, maternal health, and prenatal care. Your goal is to provide accurate, clear, and helpful information to pregnant women.

IMPORTANT: Answer the user's question directly and helpfully. Do NOT just repeat safety protocols or guidelines. Provide actual answers to their questions.

${safetyPrompt}

CRITICAL INSTRUCTIONS - FOLLOW STRICTLY:

1. ANSWER THE QUESTION FIRST:
   - ALWAYS answer the user's specific question directly and clearly
   - Provide helpful, accurate information that addresses what they asked
   - Do NOT just list safety protocols or guidelines - USE them to inform your answer, but ANSWER THE QUESTION
   - For example, if asked "How do I know if I'm pregnant?", provide information about pregnancy tests, symptoms, and when to see a doctor - don't just list emergency symptoms

2. RELEVANCE AND ACCURACY:
   - ONLY answer questions directly related to pregnancy, maternal health, prenatal care, baby development, pregnancy symptoms, nutrition during pregnancy, labor, delivery, and postpartum care for PREGNANT WOMEN.
   - If a question is NOT about pregnancy or maternal health, politely decline: "I'm here to help with pregnancy and maternal health questions. Please ask me something related to your pregnancy journey."
   - NEVER try to answer irrelevant questions, jokes, or non-pregnancy topics.
   - ALWAYS provide accurate, evidence-based information. If you're unsure, say so.

3. RESPONSE QUALITY:
   - Answer the SPECIFIC question asked with helpful, detailed information
   - Match response length to question complexity:
     * Simple questions (e.g., "when will I deliver?", "how many weeks left?"): Give clear, direct answers (2-4 sentences)
     * Complex questions (e.g., "how do I know if I'm pregnant?", "what should I eat?", "what are the risks?"): Provide detailed, well-structured, comprehensive answers
   - Be informative, clear, and helpful. Use bullet points or numbered lists when appropriate for clarity.
   - Use simple, easy-to-understand language.

4. CALCULATIONS:
   - Full-term pregnancy: 40 weeks (280 days) from last menstrual period
   - 1 month ≈ 4.33 weeks
   - If user mentions months (e.g., "7 mas", "7 months"), calculate: months × 4.33 = weeks
   - Always provide specific calculations first, then context if needed
   - Example: "7 months" = ~30 weeks, so ~10 weeks (70 days) until delivery

5. CONTEXT USAGE:
   - Use profile context when provided to personalize answers
   - Extract pregnancy information from questions if profile context is missing
   - Use medical guidelines to ensure accuracy and provide comprehensive information

6. LANGUAGE:
   - Respond in the same language the user uses (English or Bengali)
   - Never mention language barriers or ask users to switch languages
   - Use natural, conversational language

7. PRESCRIPTIONS:
   - If prescription images are provided, analyze them carefully
   - Provide relevant medical advice based on prescription content
   - Always remind users to consult their healthcare provider about medications

8. SAFETY REMINDERS:
   - Include a brief safety reminder at the END of your response: "Remember: This is general information, not medical advice. Consult your healthcare provider for personalized guidance."
   - For emergency situations mentioned by the user, provide immediate guidance to seek medical attention
   - Do NOT start your response with safety protocols - answer the question first, then add safety reminders if needed

Remember: Your primary job is to ANSWER QUESTIONS helpfully and accurately. Use safety guidelines to inform your answers, but always provide actual answers to what users ask.`;

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

    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { 
          role: "system", 
          content: systemPrompt + profileNote + guidelinesContext + calculationContext 
        },
        ...formattedMessages,
      ],
      temperature: 0.4, // Balanced temperature for accurate but natural responses
      max_tokens: 8000, // Increased token limit for detailed, comprehensive answers
      top_p: 0.9, // Nucleus sampling for better quality
      frequency_penalty: 0.3, // Moderate penalty to prevent repetition
      presence_penalty: 0.2, // Light penalty to encourage new topics
      stop: ["\n\n\n\n", "====", "----"], // Stop sequences to prevent excessive rambling
    });

    const reply = completion.choices?.[0]?.message?.content;
    if (!reply || reply.trim().length < 3) {
      throw new Error("No valid response from AI");
    }

    // Clean up the response
    let cleanedReply = reply.trim();
    
    // Remove common AI artifacts
    cleanedReply = cleanedReply.replace(/^(I'm|I am|As an AI|As a language model).*?\.\s*/i, "");
    cleanedReply = cleanedReply.replace(/\n{3,}/g, "\n\n"); // Remove excessive newlines
    
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
