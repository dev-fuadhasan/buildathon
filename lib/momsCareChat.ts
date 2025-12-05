import { groq, isGroqConfigured } from "./groqClient";

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
): Promise<string> {
  if (!isGroqConfigured()) {
    throw new Error("Groq API is not configured. Please set GROQ_API_KEY environment variable.");
  }

  try {
    const systemPrompt = `You are MomsCare, a supportive assistant for pregnant mothers.

IMPORTANT GUIDELINES:
1. You ONLY answer questions related to pregnancy, maternal health, prenatal care, baby development, and related medical topics.
2. If a user asks funny questions, jokes, irrelevant topics, or questions unrelated to pregnancy/maternal health, politely decline and ask them to ask relevant questions instead.
3. Examples of topics to decline: jokes, general trivia, unrelated health topics, entertainment, politics, etc.
4. Always include a safety reminder: you are not a substitute for professional medical advice and emergencies require contacting a healthcare provider immediately.
5. Be concise, warm, and evidence-informed. If profile context is provided, personalize the guidance while respecting privacy.
6. If prescription images are provided, analyze them carefully and provide relevant medical advice based on the prescription content.
7. LANGUAGE SUPPORT: You can understand and respond in both English and Bengali (Bangla). When a user asks in Bengali, respond in Bengali. When asked in English, respond in English. Never mention that you don't understand a language or ask users to switch languages. Always respond naturally in the same language the user uses.

When declining irrelevant questions, use a friendly but firm response in the same language the user used. For English: "I'm here to help with pregnancy and maternal health questions. Please ask me something related to your pregnancy journey, prenatal care, or maternal health, and I'll be happy to help!" For Bengali: "আমি গর্ভাবস্থা এবং মাতৃস্বাস্থ্য সম্পর্কিত প্রশ্নে সাহায্য করতে এখানে আছি। অনুগ্রহ করে আপনার গর্ভাবস্থা, প্রসবপূর্ব যত্ন, বা মাতৃস্বাস্থ্য সম্পর্কিত কিছু জিজ্ঞাসা করুন, আমি খুশি হয়ে সাহায্য করব!"`;

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
        { role: "system", content: systemPrompt + profileNote },
        ...formattedMessages,
      ],
      temperature: 0.6,
      max_tokens: 400,
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

