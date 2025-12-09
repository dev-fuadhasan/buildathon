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

CRITICAL RULES:
1. PRESERVE PUNCTUATION: If the original has a question mark (?), the translation MUST have a question mark. If it's a statement, keep it as a statement.
2. PRESERVE TONE: Questions stay questions, statements stay statements.
3. ACCURATE MEDICAL TERMS: Translate medical terms precisely, don't guess or substitute.

IMPORTANT MEDICAL TERMS:
- "pet" or "পেট" = stomach/abdomen
- "pet betha" or "পেট ব্যথা" = stomach pain/abdominal pain
- "pet fule geche" or "পেট ফুলে গেছে" = stomach is swollen/bloated (NOT pain!)
- "fule geche" or "ফুলে গেছে" = swollen/bloated/inflated
- "beshi" or "বেশি" = very/much/a lot/more
- "bomi" or "বমি" = vomiting/nausea
- "ghono bomi" or "ঘন ঘন বমি" = frequent vomiting
- "mas" or "মাস" = month
- "saptah" or "সপ্তাহ" = week
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
- "ki" or "কি" = what/is/does (question word)
- "amar" or "আমার" = my

EXAMPLES:
- "Amar pet ki beshi fule geche?" → "Is my stomach very swollen?" (NOT "I am experiencing severe stomach pain")
- "Amar pet betha korche" → "I have stomach pain"
- "Pet fule geche" → "Stomach is swollen/bloated"
- "Ki khabar khawa uchit?" → "What food should I eat?"

Translate accurately preserving:
- Exact medical meaning
- Question marks and punctuation
- Question vs statement structure
- All medical terms precisely

Only return the translated text, nothing else.`,
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
    let cleaned = translated.replace(/^(Translation:|Translated text:|English:)\s*/i, "").trim();
    
    // Ensure question mark accuracy (preserve original punctuation)
    const originalHasQuestion = text.trim().endsWith("?");
    const translatedHasQuestion = cleaned.trim().endsWith("?");
    
    if (originalHasQuestion && !translatedHasQuestion) {
      cleaned = `${cleaned}?`;
      console.log(`[Translation] Added missing question mark: "${cleaned}"`);
    } else if (!originalHasQuestion && translatedHasQuestion) {
      cleaned = cleaned.replace(/\?+$/, "").trim();
      console.log(`[Translation] Removed extra question mark: "${cleaned}"`);
    }
    
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

