import { groq, isGroqConfigured } from "./groqClient";
import { getSafetyPrompt } from "./safetyGuardrails";
import { retrieveRelevantGuidelines, formatGuidelinesForContext } from "./medicalKnowledge";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Ask the MomsCare assistant a question with optional profile context and prescription images.
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
    
    const systemPrompt = `You are MomsCare, a supportive assistant for pregnant mothers.

${safetyPrompt}

CRITICAL RULES - STRICTLY ENFORCE:

ANSWER ACCURACY AND DIRECTNESS:
1. ALWAYS answer the question asked directly and accurately. Do not provide generic information that doesn't address the specific question.
2. If asked about calculations (e.g., "how many days/weeks until delivery", "when will I deliver"), perform the calculation:
   - Full-term pregnancy is 40 weeks (280 days) from last menstrual period
   - 1 month ≈ 4.33 weeks
   - If user says "7 months" or "7 mas", calculate: 7 months × 4.33 = ~30 weeks, so approximately 10 weeks (70 days) until delivery
   - Always provide the specific answer first, then context if needed
3. Match answer length to question complexity:
   - Simple factual questions (e.g., "when will I deliver?", "how many weeks left?"): Give SHORT, direct answers (1-3 sentences)
   - Complex questions (e.g., "what should I eat?", "what are the risks?"): Provide detailed, comprehensive answers
   - Questions asking for lists or explanations: Provide structured, clear responses
4. Extract pregnancy information from the question itself:
   - "7 mas" or "7 months" = approximately 28-30 weeks
   - "5 mas" or "5 months" = approximately 20-22 weeks
   - Use this information to provide accurate, personalized answers
5. If profile context is provided, use it to personalize answers. If not provided but mentioned in question, extract and use it.

TOPIC RESTRICTIONS:
6. You ONLY answer questions related to pregnancy, maternal health, prenatal care, baby development, pregnancy symptoms, prenatal nutrition, labor and delivery, postpartum care, and related medical topics for PREGNANT WOMEN.
7. If a user asks ANY question that is NOT directly related to a pregnant woman's health, pregnancy, or maternal care, you MUST decline politely and redirect them. DO NOT attempt to answer or interpret irrelevant questions.
8. Examples of questions to DECLINE (do not answer):
   - Questions about men having babies or male pregnancy
   - Jokes, funny questions, or prank questions
   - Questions about non-pregnancy topics (entertainment, sports, politics, general trivia)
   - Questions about unrelated health topics (unless related to pregnancy complications)
   - Questions asking about people who are not pregnant
   - Questions that don't make medical sense in the context of pregnancy
9. When declining, NEVER try to interpret or answer the question. Simply state that you only help with pregnancy-related questions.

RESPONSE QUALITY:
10. Be accurate, warm, and evidence-informed. Use the provided medical guidelines to ensure accuracy.
11. If prescription images are provided, analyze them carefully and provide relevant medical advice based on the prescription content.
12. Always include a safety reminder at the end: you are not a substitute for professional medical advice and emergencies require contacting a healthcare provider immediately.
13. LANGUAGE SUPPORT: You can understand and respond in both English and Bengali (Bangla). When a user asks in Bengali, respond in Bengali. When asked in English, respond in English. Never mention that you don't understand a language or ask users to switch languages. Always respond naturally in the same language the user uses.

When declining irrelevant questions, use a CONCISE friendly but firm response in the same language the user used. DO NOT attempt to answer or interpret the question. Simply redirect with a SHORT message:
- English: "I'm here to help with pregnancy and maternal health questions. Please ask me something related to your pregnancy journey, prenatal care, or maternal health, and I'll be happy to help!"
- Bengali: "আমি গর্ভাবস্থা এবং মাতৃস্বাস্থ্য সম্পর্কিত প্রশ্নে সাহায্য করতে এখানে আছি। অনুগ্রহ করে আপনার গর্ভাবস্থা, প্রসবপূর্ব যত্ন, বা মাতৃস্বাস্থ্য সম্পর্কিত কিছু জিজ্ঞাসা করুন।"`;

    // Extract weeks pregnant from profile context or user message for RAG
    let trimester: number | undefined;
    const lastUserMessage = messages
      .filter((m) => m.role === "user")
      .pop()?.content || "";
    
    if (weeksPregnant) {
      trimester = weeksPregnant;
    } else if (profileContext) {
      const weeksMatch = profileContext.match(/Weeks pregnant:\s*(\d+)/i);
      if (weeksMatch) {
        trimester = parseInt(weeksMatch[1], 10);
      }
    } else if (lastUserMessage) {
      // Try to extract from user message (e.g., "7 mas", "7 months", "30 weeks")
      const monthsMatch = lastUserMessage.match(/(\d+)\s*(?:mas|month|months|মাস)/i);
      if (monthsMatch) {
        const months = parseInt(monthsMatch[1], 10);
        trimester = Math.round(months * 4.33); // Convert months to weeks
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
    if (lastUserMessage && (lastUserMessage.includes("delivery") || lastUserMessage.includes("deliver") || 
        lastUserMessage.includes("kotodin") || lastUserMessage.includes("when") || 
        lastUserMessage.includes("hote pare") || lastUserMessage.includes("remaining"))) {
      if (trimester) {
        const weeksRemaining = 40 - trimester;
        const daysRemaining = weeksRemaining * 7;
        calculationContext = `\n\nIMPORTANT CALCULATION CONTEXT:
- Current pregnancy: ${trimester} weeks (${Math.round(trimester / 4.33)} months)
- Full-term pregnancy: 40 weeks (280 days)
- Weeks remaining until delivery: ${weeksRemaining} weeks
- Days remaining until delivery: approximately ${daysRemaining} days
- Expected delivery: in approximately ${weeksRemaining} weeks (${daysRemaining} days)

When answering questions about delivery timing, provide this specific calculation first, then add context.`;
      } else if (lastUserMessage.match(/(\d+)\s*(?:mas|month|months|মাস)/i)) {
        const monthsMatch = lastUserMessage.match(/(\d+)\s*(?:mas|month|months|মাস)/i);
        if (monthsMatch) {
          const months = parseInt(monthsMatch[1], 10);
          const currentWeeks = Math.round(months * 4.33);
          const weeksRemaining = 40 - currentWeeks;
          const daysRemaining = weeksRemaining * 7;
          calculationContext = `\n\nIMPORTANT CALCULATION CONTEXT:
- User mentioned: ${months} months pregnant
- This equals approximately ${currentWeeks} weeks
- Full-term pregnancy: 40 weeks (280 days)
- Weeks remaining until delivery: approximately ${weeksRemaining} weeks
- Days remaining until delivery: approximately ${daysRemaining} days

When answering, provide this specific calculation FIRST, then add context.`;
        }
      }
    }
    
    const profileNote = profileContext
      ? `\n\nMother profile context:\n${profileContext}`
      : "";

    // Filter and format messages - only include user and assistant messages
    // Convert role to match Groq's expected format
    const filteredMessages = messages.filter((m) => m.role === "user" || m.role === "assistant");
    
    const formattedMessages = filteredMessages
      .map((m, index, arr) => {
        const role = (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant";
        
        // If this is the last user message and we have prescription URLs, include images
        const isLastUserMessage = role === "user" && index === arr.length - 1;
        if (isLastUserMessage && prescriptionUrls && prescriptionUrls.length > 0) {
          const textContent = (m.content || "") + (prescriptionUrls.length > 0 
            ? `\n\nI have ${prescriptionUrls.length} prescription(s) uploaded. Please analyze them and provide recommendations based on my pregnancy profile.` 
            : "");
          
          return {
            role,
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
          };
        }
        
        return {
          role,
          content: m.content || "",
        };
      })
      .filter((m) => {
        if (typeof m.content === "string") {
          return m.content.trim().length > 0;
        }
        return true; // Array content (with images) is always valid
      });

    if (formattedMessages.length === 0) {
      throw new Error("No valid messages provided");
    }

    if (!groq) {
      throw new Error("Groq client is not initialized");
    }

    // Use a vision-capable model if we have images
    const model = prescriptionUrls && prescriptionUrls.length > 0
      ? "meta-llama/llama-4-scout-17b-16e-instruct" // Vision model for image analysis
      : "llama-3.1-8b-instant"; // Regular model for text-only

    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt + profileNote + guidelinesContext + calculationContext },
        ...formattedMessages,
      ],
      temperature: 0.4, // Lower temperature for more accurate, focused answers
      max_tokens: 2000, // Increased significantly to prevent response cutoff
    });

    const reply = completion.choices?.[0]?.message?.content;
    if (!reply) {
      throw new Error("No response from AI");
    }

    return reply;
  } catch (error: any) {
    console.error("Groq API error:", error);
    throw new Error(
      error.message || "Failed to get response from AI. Please check your API key and try again."
    );
  }
}

