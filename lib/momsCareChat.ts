import { groq } from "./groqClient";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Ask the MomsCare assistant a question with optional profile context.
 */
export async function askMomsCare(
  messages: ChatMessage[],
  profileContext?: string,
): Promise<string> {
  const systemPrompt = `You are MomsCare, a supportive assistant for pregnant mothers.
Always include a safety reminder: you are not a substitute for professional medical advice and emergencies require contacting a healthcare provider immediately.
Be concise, warm, and evidence-informed. If profile context is provided, personalize the guidance while respecting privacy.`;

  const profileNote = profileContext
    ? `\n\nMother profile context:\n${profileContext}`
    : "";

  const completion = await groq.chat.completions.create({
    model: "meta-llama/llama-3.1-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt + profileNote },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ],
    temperature: 0.6,
    max_tokens: 400,
  });

  return completion.choices?.[0]?.message?.content ?? "Sorry, I could not respond.";
}

