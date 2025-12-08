/**
 * Validates and fixes AI responses
 * Single Responsibility: Output validation and cleaning
 */

export interface ValidationResult {
  isValid: boolean;
  cleaned: string;
  issues: string[];
}

/**
 * Validate response doesn't contain prescription details when it shouldn't
 * AGGRESSIVE removal of ALL prescription mentions
 */
function validateNoPrescriptions(response: string): {valid: boolean; cleaned: string} {
  let cleaned = response;
  
  // AGGRESSIVE prescription removal patterns
  const removalPatterns = [
    // Bengali prescription intro
    /আপনার প্রেসক্রিপশন[\s\S]*?(?=\n\n|আপনার যদি|যদি আপনার|$)/gi,
    /প্রেসক্রিপশন বিশ্লেষণ[\s\S]*?(?=\n\n|আপনার যদি|যদি আপনার|$)/gi,
    /নিম্নলিখিত ঔষধ[\s\S]*?(?=\n\n|আপনার যদি|যদি আপনার|$)/gi,
    
    // Medicine lists (Bengali numbers and English)
    /[১২৩৪৫৬৭৮৯০1-9]\.\s*\*\*[\s\S]*?\*\*:[\s\S]*?(?=\n[১২৩৪৫৬৭৮৯০1-9]\.|$)/gi,
    
    // Specific medicine names
    /(অ্যাজমেন্টিন|এনজাফ্লাম|প্যানডি|হেক্সিজেল|Augmentin|Enzoflam|Pan\s*D|Hexigel)[^\n]*/gi,
    
    // Dosage patterns
    /\d+\s*(মিলিগ্রাম|mg|ট্যাবলেট|tablet)[\s\S]*?(?=\n\n|$)/gi,
    
    // "For 5 days" type patterns
    /\d+\s*(দিনের জন্য|দিন|days|সপ্তাহে|week)/gi,
    
    // Medicine taking instructions
    /(খাবার পর|খাবার আগে|after food|before food).*?(?=\n|$)/gi,
    
    // Pregnancy week mentions (when not asked)
    /আপনি বর্তমানে\s*\d+\s*সপ্তাহে[\s\S]*?(?=\n\n|$)/gi,
    /আপনি\s*\d+\s*সপ্তাহের গর্ভবতী[।.\s]*/gi,
  ];
  
  let hasPrescriptions = false;
  
  for (const pattern of removalPatterns) {
    if (pattern.test(cleaned)) {
      hasPrescriptions = true;
      cleaned = cleaned.replace(pattern, '');
    }
  }
  
  // Remove "doctor safety" sentences that often accompany prescriptions
  cleaned = cleaned.replace(/গর্ভাবস্থায় এই ঔষধগুলি নিরাপদ কিনা[\s\S]*?(?=\n\n|$)/gi, '');
  cleaned = cleaned.replace(/ডাক্তার বা স্বাস্থ্যসেবা প্রদানকারীকে অবহিত[\s\S]*?(?=\n\n|$)/gi, '');
  
  // Clean up formatting
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/^\s*\n/gm, '');
  cleaned = cleaned.trim();
  
  return {
    valid: !hasPrescriptions,
    cleaned
  };
}

/**
 * Validate response doesn't have inappropriate warnings
 */
function validateNoInappropriateWarnings(
  response: string, 
  userQuestion: string
): {valid: boolean; cleaned: string} {
  let cleaned = response;
  
  // Emergency keywords that justify warnings
  const emergencyKeywords = [
    'heavy bleeding', 'severe pain', 'khub betha', 'beshi blood',
    'baccha nore na', 'no movement', 'water broke', 'jol bhenge'
  ];
  
  const hasEmergency = emergencyKeywords.some(kw => 
    userQuestion.toLowerCase().includes(kw)
  );
  
  if (!hasEmergency) {
    // Remove warnings
    const warningPatterns = [
      /⚠️\s*HIGH PRIORITY:[\s\S]*?This may require medical evaluation\.\s*/gi,
      /🚨\s*CRITICAL:[\s\S]*?Do not delay\.\s*/gi,
      /উচ্চতর চিকিৎসা সহায়তা প্রয়োজন[\s\S]*?চিকিৎসা জরুরী পরিস্থিতি\.\s*/gi,
      /^অতি দ্রুত জরুরী সেবা[\s\S]*?অপেক্ষা না করে\.\s*/gim,
      /^তখনই চিকিৎসা সহায়তা নিন[\s\S]*?\n\n/gim
    ];
    
    let hadWarnings = false;
    for (const pattern of warningPatterns) {
      if (pattern.test(cleaned)) {
        hadWarnings = true;
        cleaned = cleaned.replace(pattern, '');
      }
    }
    
    return {valid: !hadWarnings, cleaned: cleaned.trim()};
  }
  
  return {valid: true, cleaned};
}

/**
 * Add question marks to follow-up questions
 */
function fixQuestionMarks(response: string): string {
  // Only fix if response is short (likely a follow-up)
  if (response.length > 150) {
    return response;
  }
  
  const questionWords = [
    'কোথায়', 'কোন', 'কি', 'কেন', 'কখন', 'কিভাবে', 'কতটুকু', 'কতদিন', 'কত', 'কেমন', 'কার',
    'kothai', 'ki', 'keno', 'kokhon', 'kivabe', 'koto', 'kemon'
  ];
  
  const hasQuestionWord = questionWords.some(word => 
    response.toLowerCase().includes(word)
  );
  
  if (hasQuestionWord && !response.includes('?')) {
    return response.trim() + '?';
  }
  
  return response;
}

/**
 * Main validation function
 */
export function validateAndCleanResponse(
  response: string,
  userQuestion: string,
  isGeneralQuestion: boolean,
  shouldShowPrescription: boolean = false
): ValidationResult {
  let cleaned = response;
  const issues: string[] = [];
  
  // 1. Fix question marks
  cleaned = fixQuestionMarks(cleaned);
  
  // 2. Remove prescriptions unless explicitly allowed
  if (!shouldShowPrescription) {
    const prescriptionCheck = validateNoPrescriptions(cleaned);
    if (!prescriptionCheck.valid) {
      issues.push('Removed prescription details (not requested)');
    }
    cleaned = prescriptionCheck.cleaned;
  }
  
  // 3. Remove inappropriate warnings
  const warningCheck = validateNoInappropriateWarnings(cleaned, userQuestion);
  if (!warningCheck.valid) {
    issues.push('Removed inappropriate emergency warning');
  }
  cleaned = warningCheck.cleaned;
  
  // 4. For profile info requests, ensure response is concise
  if (/boyos|age|rokter group|blood group|pregnancy.*kotodin/i.test(userQuestion)) {
    // Remove long explanations
    const lines = cleaned.split('\n');
    const relevantLines = lines.filter(line => {
      const lower = line.toLowerCase();
      return (
        /বয়স|age|রক্তের গ্রুপ|blood group|সপ্তাহ|weeks|গর্ভবতী|pregnant/.test(lower) ||
        line.trim().length < 50
      );
    });
    
    if (relevantLines.length > 0 && relevantLines.length < lines.length) {
      cleaned = relevantLines.join('\n');
      issues.push('Removed unnecessary details from profile info response');
    }
  }
  
  // 5. Final cleanup
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();
  
  // If everything was removed, provide fallback
  if (cleaned.length < 10) {
    cleaned = isGeneralQuestion
      ? "দুঃখিত, আমি এই প্রশ্নের সঠিক উত্তর দিতে পারছি না। আরও নির্দিষ্ট প্রশ্ন করুন।"
      : "আপনার প্রশ্নটি একটু বিস্তারিত করুন যাতে আমি সঠিক পরামর্শ দিতে পারি।";
    issues.push('Response too short after cleaning, used fallback');
  }
  
  return {
    isValid: issues.length === 0,
    cleaned,
    issues
  };
}

