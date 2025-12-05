import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.error("Missing GROQ_API_KEY environment variable");
}

export const groq = apiKey
  ? new Groq({
      apiKey: apiKey,
    })
  : null;

// Helper to check if Groq is configured
export function isGroqConfigured(): boolean {
  return groq !== null;
}

