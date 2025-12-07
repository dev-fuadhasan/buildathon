import { groq, isGroqConfigured } from "./groqClient";

/**
 * Detect if text contains Bangla/Bengali characters or is in Banglish
 */
export function detectLanguage(text: string): "en" | "bn" {
  // Check for Bengali Unicode range: U+0980 to U+09FF
  const bengaliRegex = /[\u0980-\u09FF]/;
  
  // If text contains Bengali characters, it's Bangla/Banglish
  if (bengaliRegex.test(text)) {
    return "bn";
  }
  
  // Check for common Banglish patterns (Bengali words written in English)
  const banglishPatterns = [
    /\b(ami|tumi|apni|kemon|koto|ki|kake|karo|kore|hobe|hoy|ache|nei|jabe|asbe|khabe|kheye|koreche|korche|korbe|hoyechhe|hoyche|hoybe)\b/gi,
    /\b(mas|saptah|din|ghonta|minit|bochor|shomoy|kotha|bari|ghor|khana|pani|bhalo|kharap|sundor|bhalobasha)\b/gi,
  ];
  
  for (const pattern of banglishPatterns) {
    if (pattern.test(text)) {
      return "bn";
    }
  }
  
  return "en";
}

/**
 * Translate text from Bangla/Banglish to English using Groq AI
 */
export async function translateToEnglish(text: string): Promise<string> {
  if (!isGroqConfigured()) {
    throw new Error("Groq API is not configured");
  }

  if (!groq) {
    throw new Error("Groq client is not initialized");
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are a professional translator. Translate the following text from Bengali (Bangla) or Banglish (Bengali written in English) to clear, natural English. Preserve the meaning and context accurately. Only return the translated text, nothing else.",
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const translated = completion.choices?.[0]?.message?.content?.trim();
    if (!translated) {
      throw new Error("Translation failed");
    }

    return translated;
  } catch (error: any) {
    console.error("Translation to English error:", error);
    // If translation fails, return original text
    return text;
  }
}

/**
 * Translate text from English to Bangla using Groq AI
 */
export async function translateToBangla(text: string): Promise<string> {
  if (!isGroqConfigured()) {
    throw new Error("Groq API is not configured");
  }

  if (!groq) {
    throw new Error("Groq client is not initialized");
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are a professional translator. Translate the following text from English to clear, natural Bengali (Bangla). Preserve the meaning and context accurately. Use proper Bengali script. Only return the translated text, nothing else.",
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const translated = completion.choices?.[0]?.message?.content?.trim();
    if (!translated) {
      throw new Error("Translation failed");
    }

    return translated;
  } catch (error: any) {
    console.error("Translation to Bangla error:", error);
    // If translation fails, return original text
    return text;
  }
}

