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
  
  // Intent 8: Greeting
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
  
  // Intent 9: Logged out user - always general
  if (!isLoggedIn) {
    return {
      intent: 'ask_general_info',
      confidence: 0.7,
      shouldShowProfile: false,
      shouldShowPrescription: false,
      needsFollowUp: false,
      reason: 'User not logged in - treat as general'
    };
  }
  
  // Default: Unknown intent
  return {
    intent: 'unknown',
    confidence: 0.5,
    shouldShowProfile: false,
    shouldShowPrescription: false,
    needsFollowUp: false,
    reason: 'Could not determine clear intent'
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
  
  // Medicine without symptom
  if (/medicine|oshudh/.test(lower) && !/allergy|alargy|betha|pain/.test(lower)) {
    return "কি সমস্যার জন্য ওষুধ লাগবে? (অ্যালার্জি/ব্যথা/জ্বর?)";
  }
  
  // Allergy medicine without type
  if (/(alargy|allergy).*medicine/.test(lower)) {
    return "কি ধরনের অ্যালার্জি? (খাবার/ত্বক/ধুলো?)";
  }
  
  // Pain without location
  if (/(betha|pain)/.test(lower) && !/pet|matha|pith|head|back/.test(lower)) {
    return "কোথায় ব্যথা করছে? (পেট/মাথা/পিঠ?)";
  }
  
  // Discharge without details
  if (/discharge/.test(lower) && !/white|sada|yellow|holud|color/.test(lower)) {
    return "কি রঙের discharge? কতদিন ধরে?";
  }
  
  return "আপনার প্রশ্নটি একটু বিস্তারিত করুন।";
}

