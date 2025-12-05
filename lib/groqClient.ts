import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

// Groq SDK can read from GROQ_API_KEY env var automatically
// Initialize Groq client - if apiKey is provided, use it; otherwise SDK will read from env
export const groq = apiKey ? new Groq({ apiKey }) : new Groq();

// Helper to check if Groq is configured
export function isGroqConfigured(): boolean {
  // Check if API key exists in env (either passed explicitly or available in process.env)
  return !!process.env.GROQ_API_KEY;
}

