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
Always include a safety reminder: you are not a substitute for professional medical advice and emergencies require contacting a healthcare provider immediately.
Be concise, warm, and evidence-informed. If profile context is provided, personalize the guidance while respecting privacy.
If prescription images are provided, analyze them carefully and provide relevant medical advice based on the prescription content.`;

    const profileNote = profileContext
      ? `\n\nMother profile context:\n${profileContext}`
      : "";

    // Filter and format messages - only include user and assistant messages
    // Convert role to match Groq's expected format
    const formattedMessages = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => {
        const role = (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant";
        
        // If this is the last user message and we have prescription URLs, include images
        if (role === "user" && prescriptionUrls && prescriptionUrls.length > 0 && m === messages[messages.length - 1]) {
          return {
            role,
            content: [
              { type: "text", text: m.content || "" },
              ...prescriptionUrls.map((url) => ({
                type: "image_url" as const,
                image_url: { url },
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
    // Try vision model first, fallback to regular model if not available
    const model = prescriptionUrls && prescriptionUrls.length > 0
      ? "llama-3.2-11b-vision-preview" // Vision model for image analysis
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

