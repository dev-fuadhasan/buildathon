/**
 * Intent Detection System
 * Understands WHAT the user wants, not just keywords
 */

export type UserIntent = 
  | 'ask_profile_info'           // "amar boyos ki?"
  | 'ask_prescription'           // "amar prescription ki?"
  | 'ask_for_question'           // "amake proshno koro"
  | 'ask_medical_advice'         // "amar pet betha"
  | 'ask_general_info'           // "mayera ki khabe?"
  | 'ask_clarification'          // "ei medicine keno?"
  | 'greeting'                   // "hello"
  | 'unknown';

export interface IntentResult {
  intent: UserIntent;
  confidence: number;
  shouldShowProfile: boolean;
  shouldShowPrescription: boolean;
  needsFollowUp: boolean;
  reason: string;
}

/**
 * Detect user intent from question
 */
export function detectIntent(question: string, isLoggedIn: boolean): IntentResult {
  const lower = question.toLowerCase().trim();
  
  // CRITICAL: Logged-out users can NEVER have personal intents
  // Handle this at the START to prevent any downstream issues
  if (!isLoggedIn) {
    // Check if it's a greeting
    if (/^(hello|hi|hey|assalamualaikum|salam)$/i.test(lower)) {
      return {
        intent: 'greeting',
        confidence: 0.95,
        shouldShowProfile: false,
        shouldShowPrescription: false,
        needsFollowUp: false,
        reason: 'Greeting from logged-out user'
      };
    }
    
    // Check if they want AI to ask a question
    if (/amake.*proshno|ask me.*question|proshno koro|question koro/i.test(lower)) {
      return {
        intent: 'ask_for_question',
        confidence: 0.95,
        shouldShowProfile: false,
        shouldShowPrescription: false,
        needsFollowUp: false,
        reason: 'Logged-out user wants a question'
      };
    }
    
    // ALL other logged-out queries are general information requests
    return {
      intent: 'ask_general_info',
      confidence: 0.9,
      shouldShowProfile: false,
      shouldShowPrescription: false,
      needsFollowUp: false,
      reason: 'Logged-out user - all queries treated as general'
    };
  }
  
  // From here, user IS logged in
  
  // Intent 1: User asking AI to ask them a question
  if (/amake.*proshno|ask me.*question|proshno koro|question koro/i.test(lower)) {
    return {
      intent: 'ask_for_question',
      confidence: 0.95,
      shouldShowProfile: false,
      shouldShowPrescription: false,
      needsFollowUp: false,
      reason: 'User wants AI to ask them a question'
    };
  }
  
  // Intent 2: Asking for profile info (age, blood group, etc.)
  if (isLoggedIn && /amar (boyos|age|rokter group|blood group|nam|name|info|profile)/.test(lower)) {
    return {
      intent: 'ask_profile_info',
      confidence: 0.9,
      shouldShowProfile: true,  // Show ONLY what they asked
      shouldShowPrescription: false,
      needsFollowUp: false,
      reason: 'User asking for specific profile information'
    };
  }
  
  // Intent 3: Explicitly asking for prescription
  if (isLoggedIn && /(amar prescription|amar medicine list|ki medicine khachi|kon oshudh)/.test(lower)) {
    return {
      intent: 'ask_prescription',
      confidence: 0.9,
      shouldShowProfile: false,
      shouldShowPrescription: true,
      needsFollowUp: false,
      reason: 'User explicitly asking for prescription details'
    };
  }
  
  // Intent 4: Asking about pregnancy duration
  if (isLoggedIn && /(pregnancy.*kotodin|koto mas|how long pregnant|kotogulo mas)/.test(lower)) {
    return {
      intent: 'ask_profile_info',
      confidence: 0.85,
      shouldShowProfile: true,  // Show ONLY pregnancy duration
      shouldShowPrescription: false,
      needsFollowUp: false,
      reason: 'User asking about pregnancy duration'
    };
  }
  
  // Intent 5: Medical advice with ambiguous symptom
  if (isLoggedIn && /amar ki.*(medicine|oshudh|khabo|dorkar|lagbe)/.test(lower)) {
    // Check if symptom is specified
    const hasSymptom = /(allergy|alargy|betha|pain|jor|fever|discharge)/.test(lower);
    
    if (!hasSymptom) {
      return {
        intent: 'ask_medical_advice',
        confidence: 0.8,
        shouldShowProfile: false,
        shouldShowPrescription: false,
        needsFollowUp: true,  // Need to ask what's wrong
        reason: 'Medicine question without symptom - needs follow-up'
      };
    }
    
    return {
      intent: 'ask_medical_advice',
      confidence: 0.85,
      shouldShowProfile: true,  // Use profile to personalize
      shouldShowPrescription: false,  // Don't show unless asked
      needsFollowUp: false,
      reason: 'Medical advice question with symptom'
    };
  }
  
  // Intent 6: General question (about mothers/people)
  if (/(mayera|mohilader|pregnant women|mothers|ki ki.*mene|what should)/.test(lower)) {
    return {
      intent: 'ask_general_info',
      confidence: 0.9,
      shouldShowProfile: false,
      shouldShowPrescription: false,
      needsFollowUp: false,
      reason: 'General informational question'
    };
  }
  
  // Intent 7: Personal medical question
  if (isLoggedIn && /amar.*(betha|pain|problem|somossa|discharge|swelling)/.test(lower)) {
    // Check if location/details specified
    const hasDetails = /(pet|matha|pith|head|back|kothai)/.test(lower);
    
    return {
      intent: 'ask_medical_advice',
      confidence: 0.85,
      shouldShowProfile: true,
      shouldShowPrescription: false,
      needsFollowUp: !hasDetails,
      reason: hasDetails ? 'Specific medical question' : 'Medical question needs location'
    };
  }
  
  // Intent 8: Greeting (for logged-in users)
  if (/^(hello|hi|hey|assalamualaikum|salam)$/i.test(lower)) {
    return {
      intent: 'greeting',
      confidence: 0.95,
      shouldShowProfile: false,
      shouldShowPrescription: false,
      needsFollowUp: false,
      reason: 'Greeting message'
    };
  }
  
  // Default: Unknown intent (for logged-in users)
  // If we reach here, the query doesn't match any pattern
  return {
    intent: 'ask_general_info',  // Safer to treat as general than unknown
    confidence: 0.6,
    shouldShowProfile: false,
    shouldShowPrescription: false,
    needsFollowUp: false,
    reason: 'No clear pattern matched - treating as general for safety'
  };
}

/**
 * Generate appropriate follow-up question based on intent
 */
export function generateFollowUpQuestion(question: string, intent: IntentResult): string | null {
  if (!intent.needsFollowUp) {
    return null;
  }
  
  const lower = question.toLowerCase();
  
  // Detect language
  const isBangla = /[\u0980-\u09FF]/.test(question) || /amar|ami|ki|kivabe|kemon/.test(lower);
  
  // Medicine without symptom
  if (/medicine|oshudh/.test(lower) && !/allergy|alargy|betha|pain|jor|fever/.test(lower)) {
    return isBangla
      ? "কি সমস্যার জন্য ওষুধ লাগবে? (অ্যালার্জি/ব্যথা/জ্বর?)"
      : "What problem do you need medicine for? (Allergy/Pain/Fever?)";
  }
  
  // Allergy medicine without type
  if (/(alargy|allergy).*medicine/.test(lower)) {
    return isBangla
      ? "কি ধরনের অ্যালার্জি? (খাবার/ত্বক/ধুলো?)"
      : "What type of allergy? (Food/Skin/Dust?)";
  }
  
  // Pain without location
  if (/(betha|pain)/.test(lower) && !/pet|matha|pith|head|back|kothai/.test(lower)) {
    return isBangla
      ? "কোথায় ব্যথা করছে? (পেট/মাথা/পিঠ?)"
      : "Where is the pain? (Stomach/Head/Back?)";
  }
  
  // Discharge without details
  if (/discharge/.test(lower) && !/white|sada|yellow|holud|color|rong/.test(lower)) {
    return isBangla
      ? "কি রঙের discharge? কতদিন ধরে?"
      : "What color is the discharge? How long has it been?";
  }
  
  // Generic follow-up
  return isBangla
    ? "আপনার প্রশ্নটি একটু বিস্তারিত করুন।"
    : "Please provide more details about your question.";
}

