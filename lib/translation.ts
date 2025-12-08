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
    // Common verbs and pronouns
    /\b(ami|tumi|apni|kemon|koto|kototi|ki|kake|karo|kore|hobe|hoy|ache|nei|jabe|asbe|khabe|kheye|koreche|korche|korbe|hoyechhe|hoyche|hoybe)\b/gi,
    // Time and place
    /\b(mas|mash|saptah|soptaho|din|ghonta|minit|bochor|bochhor|shomoy|somoy|kotha|bari|ghor|khana|pani|bhalo|valo|kharap|sundor|bhalobasha)\b/gi,
    // Pregnancy specific
    /\b(gorbho|gorbhobostha|gorbhabostha|prosob|proshob|prosuti|baby|baccha|shishu|hospital|dakter|daktar|doctor|appointment|dikkat|problem|byatha|betha)\b/gi,
    // Questions words
    /\b(kivabe|kibhabe|kkhon|kokhon|keno|kothay|kar|kisher|kothai|kotota|kotogulo)\b/gi,
    // Medical terms in Banglish
    /\b(amar|amake|amader|tomar|apnar|purbo|purba|lokho|lokkho|rakha|uchit|ucit)\b/gi,
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
 * Enhanced with medical/pregnancy term awareness
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
          content: `You are a professional medical translator specializing in pregnancy and maternal health. Translate the following text from Bengali (Bangla) or Banglish (Bengali written in English) to clear, accurate English.

CRITICAL: Pay special attention to medical and pregnancy-related terms:
- "bomi" or "বমি" = vomiting/nausea
- "ghono bomi" or "ঘন ঘন বমি" = frequent vomiting
- "mas" or "মাস" = month
- "saptah" or "সপ্তাহ" = week
- "pet" or "পেট" = stomach/abdomen
- "pet betha" or "পেট ব্যথা" = stomach pain/abdominal pain
- "kharap" or "খারাপ" = bad/not good
- "valo" or "ভালো" = good
- "lokkhon" or "লক্ষণ" = symptom/sign
- "dokkhin" or "ডাক্তার" = doctor
- "osustho" or "অসুস্থ" = sick/unwell
- "jhor" or "জ্বর" = fever
- "pet kharap" or "পেট খারাপ" = stomach upset/diarrhea
- "matha betha" or "মাথা ব্যথা" = headache
- "dhoron" or "ধরন" = type/kind
- "kemon" or "কেমন" = how/what kind
- "koto" or "কত" = how much/how many

Translate accurately preserving the exact medical meaning. If the text is about pregnancy symptoms, vomiting, pain, or health concerns, translate those terms precisely. Only return the translated text, nothing else.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.2, // Lower temperature for more accurate translation
      max_tokens: 1000,
    });

    const translated = completion.choices?.[0]?.message?.content?.trim();
    if (!translated) {
      throw new Error("Translation failed");
    }

    // Clean up any extra text the model might add
    const cleaned = translated.replace(/^(Translation:|Translated text:|English:)\s*/i, "").trim();
    
    return cleaned;
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

