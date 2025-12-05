import { groq, isGroqConfigured } from "./groqClient";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Ask the MomsCare assistant a question with optional profile context.
 */
export async function askMomsCare(
  messages: Array<{ role: string; content: string }>,
  profileContext?: string,
): Promise<string> {
  if (!isGroqConfigured()) {
    throw new Error("Groq API is not configured. Please set GROQ_API_KEY environment variable.");
  }

  try {
    const systemPrompt = `You are MomsCare, a supportive assistant for pregnant mothers.
Always include a safety reminder: you are not a substitute for professional medical advice and emergencies require contacting a healthcare provider immediately.
Be concise, warm, and evidence-informed. If profile context is provided, personalize the guidance while respecting privacy.`;

    const profileNote = profileContext
      ? `\n\nMother profile context:\n${profileContext}`
      : "";

    // Filter and format messages - only include user and assistant messages
    // Convert role to match Groq's expected format
    const formattedMessages = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
        content: m.content || "",
      }))
      .filter((m) => m.content.trim().length > 0);

    if (formattedMessages.length === 0) {
      throw new Error("No valid messages provided");
    }

    if (!groq) {
      throw new Error("Groq client is not initialized");
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // Valid Groq model (alternative: "mixtral-8x7b-32768", "llama-3-8b-8192")
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

