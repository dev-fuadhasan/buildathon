import Groq from "groq-sdk";

// Lazy initialization to avoid build-time errors
let groqInstance: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqInstance) {
    const apiKey = process.env.GROQ_API_KEY;
    // During build, env vars may not be available - create a dummy instance
    // This will fail at runtime if actually used, which is expected
    if (!apiKey && (process.env.NODE_ENV === "production" && !process.env.VERCEL && !process.env.NETLIFY)) {
      // Only throw in production if not in a build environment
      throw new Error("The GROQ_API_KEY environment variable is missing or empty");
    }
    groqInstance = apiKey ? new Groq({ apiKey }) : new Groq({ apiKey: "dummy-key-for-build" });
  }
  return groqInstance;
}

// Export a getter that initializes lazily
export const groq = new Proxy({} as Groq, {
  get(_target, prop) {
    return getGroqClient()[prop as keyof Groq];
  },
});

// Helper to check if Groq is configured
export function isGroqConfigured(): boolean {
  // Check if API key exists in env (either passed explicitly or available in process.env)
  return !!process.env.GROQ_API_KEY;
}

