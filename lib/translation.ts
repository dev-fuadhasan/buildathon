import { translateWithGroq, isTranslationConfigured } from "./translationClient";

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
 * Translate text from Bangla/Banglish to English using Groq
 * Simple translation - just translate, nothing more
 */
export async function translateToEnglish(text: string): Promise<string> {
  if (!isTranslationConfigured()) {
    throw new Error("Translation API is not configured. Set TRANS_KEY_1 through TRANS_KEY_20");
  }

  console.log(`[Translation] Input (BN/Banglish): "${text}"`);

  try {
    // Simple translation prompt
    const prompt = `Translate the following text from Bengali (Bangla) or Banglish (Bengali written in English) to clear, accurate English. Preserve punctuation and question marks. Only return the translated text, nothing else.

Text to translate: ${text}`;

    const translated = await translateWithGroq(prompt);
    let cleaned = translated.replace(/^(Translation:|Translated text:|English:)\s*/i, "").trim();

    if (!cleaned) {
      throw new Error("Translation failed");
    }

    // Preserve question marks
    const originalHasQuestion = text.trim().endsWith("?");
    const translatedHasQuestion = cleaned.trim().endsWith("?");

    if (originalHasQuestion && !translatedHasQuestion) {
      cleaned = `${cleaned}?`;
      console.log(`[Translation] Added missing question mark: "${cleaned}"`);
    } else if (!originalHasQuestion && translatedHasQuestion) {
      cleaned = cleaned.replace(/\?+$/, "").trim();
      console.log(`[Translation] Removed extra question mark: "${cleaned}"`);
    }

    console.log(`[Translation] Output (EN): "${cleaned}"`);
    return cleaned;
  } catch (error: any) {
    console.error("Translation to English error:", error);
    return text;
  }
}

/**
 * Translate text from English to Bangla using Groq
 * Simple translation - just translate, nothing more
 */
export async function translateToBangla(text: string): Promise<string> {
  if (!isTranslationConfigured()) {
    throw new Error("Translation API is not configured. Set TRANS_KEY_1 through TRANS_KEY_20");
  }

  console.log(`[Translation] Input (EN): "${text}"`);

  try {
    // Simple translation prompt
    const prompt = `Translate the following text from English to clear, natural Bengali (Bangla). Use proper Bengali script. Only return the translated text, nothing else.

Text to translate: ${text}`;

    const translated = await translateWithGroq(prompt);
    const cleaned = translated.trim();
    
    if (!cleaned) {
      throw new Error("Translation failed");
    }
    
    console.log(`[Translation] Output (BN): "${cleaned}"`);
    return cleaned;
  } catch (error: any) {
    console.error("Translation to Bangla error:", error);
    return text;
  }
}

