/**
 * Helper functions for chat functionality
 */

/**
 * Detects if a question is personal (about the user) or general
 * Returns true if personal, false if general
 * 
 * IMPROVED LOGIC:
 * - Strong personal indicators → personal
 * - Strong general indicators → general
 * - Educational/knowledge questions → general
 * - Symptom questions without "my/I" → general (unless very specific)
 */
export function isPersonalQuestion(message: string): boolean {
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
 * Detects if asking follow-up questions would improve the answer quality
 * Returns { needsFollowUp: boolean, questions: string[] }
 */
export function needsFollowUpQuestions(
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

