/**
 * Helper functions for chat functionality
 */

import { groq, isGroqConfigured } from "./groqClient";

/**
 * AI-based detection: Determines if a question is personal (about the user) or general
 * Uses Groq AI instead of keyword matching for better accuracy
 * Returns true if personal, false if general
 */
export async function isPersonalQuestion(message: string): Promise<boolean> {
  // If Groq is not configured, fallback to simple detection
  if (!isGroqConfigured()) {
    return isPersonalQuestionFallback(message);
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // Fast, cheap model for classification
      messages: [
        {
          role: "system",
          content: `You are a question classifier. Analyze if a question is PERSONAL (about the user asking) or GENERAL (educational/knowledge).

PERSONAL questions:
- User asking about themselves: "my", "amar", "I", "ami"
- User's symptoms, conditions, medications
- User's pregnancy, baby, reports
- "What should I do?", "Can I...?", "Should I...?"
- "Amar ki korte hobe?", "Amake ki...?"

GENERAL questions:
- Educational: "What is...?", "Why is...?", "How does...?"
- Knowledge: "Ki hote pare?", "Keno hoy?", "Kemon hoy?"
- General advice: "What should mothers...?", "Generally...", "In general..."
- Comparison: "Which is better?", "Difference between..."

Respond with ONLY one word: "PERSONAL" or "GENERAL"`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.1, // Very low for consistent classification
      max_tokens: 10, // Just need one word
    });

    const response = completion.choices?.[0]?.message?.content?.trim().toUpperCase() || "";
    const isPersonal = response.includes("PERSONAL");
    
    console.log(`[Question Classifier] "${message.substring(0, 50)}..." → ${isPersonal ? "PERSONAL" : "GENERAL"}`);
    return isPersonal;
  } catch (error: any) {
    console.error("[Question Classifier] AI classification failed, using fallback:", error.message);
    // Fallback to simple detection if AI fails
    return isPersonalQuestionFallback(message);
  }
}

/**
 * Fallback keyword-based detection (used if AI fails or Groq not configured)
 */
function isPersonalQuestionFallback(message: string): boolean {
  const text = message.toLowerCase().trim();
  
  // STRONG personal indicators (Bengali and English)
  const strongPersonalKeywords = [
    // First person pronouns
    "amar", "amake", "amader", "ami",
    "my", "me", "i am", "i'm", "i have", "i feel",
    
    // Personal possessive medical terms
    "amar baby", "amar pregnancy", "amar report", "amar prescription",
    "amar bp", "amar problem", "amar jonno", "amar test",
    "my baby", "my pregnancy", "my report", "my prescription",
    "my bp", "my problem", "my test", "my condition",
    
    // Direct personal questions
    "what should i", "should i", "can i", "do i need",
    "amake ki", "amar ki korte hobe", "amar kora uchit",
    "amar somporke", "amar bare", "about me", "about my",
    
    // Specific personal medical states
    "amar hoyeche", "amar ache", "amar lagche",
    "i'm experiencing", "i'm feeling", "i have been",
  ];
  
  // STRONG general indicators
  const strongGeneralKeywords = [
    // Explicit general terms
    "generally", "in general", "generalized", "samanya",
    "other mothers", "some mothers", "onnoder", "onno ma",
    "if someone", "if a woman", "if a mother",
    "jodi kono", "jodi ekjon", "ekjon ma",
    "hypothetically", "for example", "suppose",
    
    // Knowledge/educational questions
    "what is", "what are", "what does", "define",
    "ki eta", "eta ki", "ki bola hoy",
    "meaning of", "explain", "describe",
    
    // Research/comparison questions
    "difference between", "comparison", "which is better",
    "parthokko", "tulona",
  ];
  
  // Medical knowledge questions (usually general)
  const knowledgeQuestionPatterns = [
    /^what (is|are|does|means?)/, // "What is anemia?"
    /^why (is|are|do|does)/, // "Why is iron important?"
    /^how (does|do|is|are)/, // "How does ultrasound work?"
    /^when (should|do|does)/, // "When should mothers take vitamins?"
    /^ki (hote pare|hoy|kora uchit)/, // "Ki hote pare...?"
    /^keno (hoy|hote pare)/, // "Keno hoy...?"
    /^kemon (hoy|kore)/, // "Kemon hoy...?"
  ];
  
  // Check for STRONG personal indicators FIRST
  const hasStrongPersonal = strongPersonalKeywords.some(keyword => 
    text.includes(keyword)
  );
  
  // Check for STRONG general indicators
  const hasStrongGeneral = strongGeneralKeywords.some(keyword => 
    text.includes(keyword)
  );
  
  // Check for knowledge question patterns
  const isKnowledgeQuestion = knowledgeQuestionPatterns.some(pattern => 
    pattern.test(text)
  );
  
  // Decision tree (prioritized)
  
  // 1. If has strong personal indicators → PERSONAL
  if (hasStrongPersonal && !hasStrongGeneral) {
    return true;
  }
  
  // 2. If has strong general indicators OR is a knowledge question → GENERAL
  if (hasStrongGeneral || isKnowledgeQuestion) {
    return false;
  }
  
  // 3. If both personal and general indicators → Check which is stronger
  if (hasStrongPersonal && hasStrongGeneral) {
    // Personal takes precedence (user asking about themselves)
    return true;
  }
  
  // 4. Ambiguous case - check for indirect personal indicators
  const indirectPersonalIndicators = [
    "should i", "can i", "do i", "may i",
    "amake", "amar jonno", "amake ki",
  ];
  
  const hasIndirectPersonal = indirectPersonalIndicators.some(keyword => 
    text.includes(keyword)
  );
  
  if (hasIndirectPersonal) {
    return true;
  }
  
  // 5. Default: Questions about concepts/knowledge → GENERAL
  // Questions about specific symptoms without "I/my" → still GENERAL
  // This is a safer default for educational queries
  return false; // Changed default to GENERAL
}

/**
 * Detects if the question needs a comprehensive/list-based answer
 * Returns true for "what things", "what should", "how to", "tips", "guidelines" type questions
 */
export function needsComprehensiveAnswer(message: string): boolean {
  const text = message.toLowerCase().trim();
  
  const comprehensiveIndicators = [
    // List-based questions (English)
    "what things", "what should", "what can", "what are",
    "how to", "how can", "ways to", "tips", "guidelines",
    "what all", "list of", "suggestions", "advice",
    "steps", "precautions", "care", "follow", "do and don't",
    
    // List-based questions (Bangla/Banglish)
    "ki ki", "kiki", "kon kon", "kokhon kokhon",
    "kivabe", "kibhabe", "kothay kothay",
    "poramorsho", "upay", "tips", "guidelines",
    "mene colte hobe", "mene colbe", "kora uchit",
    "kora dorkar", "rakhte hobe", "dekha uchit",
    
    // Comprehensive topics
    "diet", "food", "khabar", "exercise", "byayam",
    "prepare", "prostuti", "ready", "taiyar",
  ];
  
  // Check if question contains comprehensive indicators
  return comprehensiveIndicators.some(indicator => text.includes(indicator));
}

/**
 * AI-based: Decides if follow-up questions are needed and what they should be
 * Returns { needsFollowUp: boolean, questions: string[] }
 */
export async function needsFollowUpQuestions(
  message: string,
  isPersonal: boolean,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<{ needsFollowUp: boolean; questions: string[] }> {
  // If Groq is not configured, fallback to keyword-based
  if (!isGroqConfigured()) {
    return needsFollowUpQuestionsFallback(message, isPersonal);
  }

  try {
    const historyContext = conversationHistory && conversationHistory.length > 0
      ? `\n\nConversation history:\n${conversationHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}`
      : '';

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `Decide if this question needs follow-up questions for better guidance.

YES + questions if: "I have pain" → ask "Where?" "How severe?"
NO if: "What is anemia?" or "I'm 6 months pregnant with mild back pain"

Respond ONLY in JSON:
{"needsFollowUp": true/false, "questions": ["Q1", "Q2"] or []}`,
        },
        {
          role: "user",
          content: message + (historyContext ? `\n\nContext: ${historyContext.substring(0, 100)}` : ''),
        },
      ],
      temperature: 0.2,
      max_tokens: 150, // Reduced from 200 for faster response
    });

    const response = completion.choices?.[0]?.message?.content?.trim() || "";
    
    // Try to parse JSON response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const needsFollowUp = parsed.needsFollowUp === true;
        const questions = Array.isArray(parsed.questions) ? parsed.questions.filter((q: any) => q && typeof q === 'string') : [];
        
        console.log(`[Follow-up Detection] Needs follow-up: ${needsFollowUp}, Questions: ${questions.length}`);
        return { needsFollowUp, questions };
      }
    } catch (parseError) {
      console.error("[Follow-up Detection] Failed to parse AI response:", parseError);
    }
    
    // Fallback if parsing fails
    return needsFollowUpQuestionsFallback(message, isPersonal);
  } catch (error: any) {
    console.error("[Follow-up Detection] AI classification failed, using fallback:", error.message);
    return needsFollowUpQuestionsFallback(message, isPersonal);
  }
}

/**
 * AI-based: Decides if profile data should be used for logged-in users
 * Returns true if profile data should be analyzed and used in answer
 */
export async function shouldUseProfileData(
  message: string,
  profileContext?: string
): Promise<boolean> {
  // If no profile context, don't use it
  if (!profileContext) {
    return false;
  }

  // If Groq is not configured, default to true (use profile)
  if (!isGroqConfigured()) {
    return true;
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `Decide: Does this question need personal profile data (pregnancy week, medical history, prescriptions)?

YES if: "my pain", "should I", "what should I eat", "can I travel"
NO if: "What is anemia?", "Why is iron important?", "How does ultrasound work?"

Respond with ONLY: "YES" or "NO"`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.1,
      max_tokens: 5, // Reduced from 10 for faster response
    });

    const response = completion.choices?.[0]?.message?.content?.trim().toUpperCase() || "";
    const shouldUse = response.includes("YES");
    
    console.log(`[Profile Usage] Should use profile data: ${shouldUse} for question: "${message.substring(0, 50)}..."`);
    return shouldUse;
  } catch (error: any) {
    console.error("[Profile Usage] AI decision failed, defaulting to use profile:", error.message);
    return true; // Default to using profile if AI fails
  }
}

/**
 * Fallback keyword-based follow-up detection (used if AI fails)
 */
function needsFollowUpQuestionsFallback(
  message: string,
  isPersonal: boolean
): { needsFollowUp: boolean; questions: string[] } {
  const text = message.toLowerCase().trim();
  
  const followUpScenarios: Array<{
    keywords: string[];
    questions: { en: string; bn: string }[];
  }> = [
    // Pain/discomfort questions
    {
      keywords: ["pain", "hurt", "ache", "byatha", "betha", "lagche"],
      questions: [
        {
          en: "Where exactly is the pain located?",
          bn: "ব্যথা ঠিক কোথায় হচ্ছে?"
        },
        {
          en: "How severe is it (mild/moderate/severe)?",
          bn: "ব্যথা কতটা তীব্র (হালকা/মাঝারি/তীব্র)?"
        },
        {
          en: "When did it start?",
          bn: "কখন থেকে শুরু হয়েছে?"
        }
      ]
    },
    // Bleeding questions
    {
      keywords: ["bleeding", "blood", "spotting", "rakto", "roktopat"],
      questions: [
        {
          en: "How heavy is the bleeding (light spotting/moderate/heavy)?",
          bn: "রক্তপাত কতটা (হালকা/মাঝারি/বেশি)?"
        },
        {
          en: "What color is it (bright red/dark/brown)?",
          bn: "রং কেমন (উজ্জ্বল লাল/গাঢ়/বাদামী)?"
        }
      ]
    },
    // Medication questions
    {
      keywords: ["medicine", "medication", "oushodh", "tablet", "pill"],
      questions: [
        {
          en: "How many weeks pregnant are you?",
          bn: "আপনার গর্ভাবস্থার কত সপ্তাহ?"
        },
        {
          en: "Do you have any medical conditions or allergies?",
          bn: "আপনার কি কোনো চিকিৎসা অবস্থা বা অ্যালার্জি আছে?"
        }
      ]
    },
    // Diet/nutrition questions
    {
      keywords: ["eat", "food", "diet", "nutrition", "khabar", "khawa"],
      questions: [
        {
          en: "Which trimester are you in (first/second/third)?",
          bn: "আপনি কোন ত্রৈমাসিকে আছেন (প্রথম/দ্বিতীয়/তৃতীয়)?"
        },
        {
          en: "Do you have any dietary restrictions or conditions (diabetes, anemia)?",
          bn: "আপনার কি কোনো খাদ্য বিধিনিষেধ বা রোগ আছে (ডায়াবেটিস, রক্তাল্পতা)?"
        }
      ]
    },
    // General symptoms (vague)
    {
      keywords: ["feel", "feeling", "lag", "lagche", "mon", "osthir"],
      questions: [
        {
          en: "Can you describe the symptoms more specifically?",
          bn: "আপনি লক্ষণগুলো আরো বিস্তারিত বলতে পারবেন?"
        },
        {
          en: "When did this start?",
          bn: "এটি কখন শুরু হয়েছে?"
        }
      ]
    }
  ];
  
  // Find matching scenario
  for (const scenario of followUpScenarios) {
    const hasKeyword = scenario.keywords.some(keyword => text.includes(keyword));
    
    if (hasKeyword && isPersonal) {
      // Detect language to return appropriate questions
      const hasBengaliScript = /[\u0980-\u09FF]/.test(message);
      const isBanglish = !hasBengaliScript && 
        /(amar|amake|gorbho|prosob|mas|koto|ki|kemon|kivabe)/i.test(text);
      
      const useBangla = hasBengaliScript || isBanglish;
      
      const questions = scenario.questions
        .slice(0, 2) // Limit to 2 follow-up questions
        .map(q => useBangla ? q.bn : q.en);
      
      return {
        needsFollowUp: true,
        questions
      };
    }
  }
  
  return { needsFollowUp: false, questions: [] };
}

