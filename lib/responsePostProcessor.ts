/**
 * Post-process AI responses to fix common issues
 * This is more reliable than relying on AI to follow instructions
 */

/**
 * Add question marks to follow-up questions if missing
 */
export function fixQuestionMarks(response: string): string {
  // Pattern: Bangla question words at end of sentence without "?"
  const questionPatterns = [
    /\b(কোথায়|কোন|কি|কেন|কখন|কিভাবে|কতটুকু|কতদিন|কত|কেমন|কার)\s+([^\?\.]+)$/gm,
    /\b(kothai|kothay|ki|keno|why|kokhon|when|kivabe|how|koto|how much|kemon|kar)\s+([^\?\.]+)$/gim,
  ];
  
  let fixed = response;
  
  // If response is very short (< 100 chars) and has question words, likely a follow-up
  if (response.length < 150) {
    for (const pattern of questionPatterns) {
      if (pattern.test(fixed) && !fixed.includes('?')) {
        // This is a follow-up question without "?"
        fixed = fixed.trim();
        if (!fixed.endsWith('?') && !fixed.endsWith('.')) {
          fixed += '?';
        }
      }
    }
  }
  
  return fixed;
}

/**
 * Remove inappropriate emergency warnings for non-emergency questions
 */
export function removeInappropriateWarnings(response: string, userQuestion: string): string {
  const emergencyKeywords = [
    // English
    'heavy bleeding', 'severe pain', 'excruciating', 
    'no movement', 'water broke', 'seizure', 'convulsion',
    'unconscious', 'can\'t breathe', 'chest pain',
    'heavy blood', 'bleeding heavily', 'bleeding a lot',
    'blood everywhere', 'lots of blood', 'severe bleeding',
    
    // Bangla/Banglish
    'khub betha', 'beshi betha', 'beshi blood', 
    'blood beshi', 'baccha nore na', 'bachha move korche na',
    'jol bhenge', 'water break', 'sans nite parchi na',
    'breath nite parchi na', 'buk e betha'
  ];
  
  // Check if user question actually mentions an emergency
  const hasEmergencyInQuestion = emergencyKeywords.some(keyword => 
    userQuestion.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // If no emergency in question, remove emergency warnings
  if (!hasEmergencyInQuestion) {
    let cleaned = response;
    
    // Remove high priority warnings
    cleaned = cleaned.replace(/⚠️\s*HIGH PRIORITY:.*?This may require medical evaluation\.\s*/gi, '');
    
    // Remove critical emergency warnings
    cleaned = cleaned.replace(/🚨\s*CRITICAL:.*?Do not delay\.\s*/gi, '');
    
    // Remove "উচ্চতর চিকিৎসা সহায়তা প্রয়োজন..." emergency text
    cleaned = cleaned.replace(/উচ্চতর চিকিৎসা সহায়তা প্রয়োজন.*?চিকিৎসা জরুরী পরিস্থিতি\.\s*/gi, '');
    
    // Remove standalone emergency phrases at start
    cleaned = cleaned.replace(/^(অতি দ্রুত জরুরী সেবা.*?অপেক্ষা না করে\.\s*)/gi, '');
    cleaned = cleaned.replace(/^(তখনই চিকিৎসা সহায়তা নিন.*?)\n\n/gi, '');
    
    return cleaned.trim();
  }
  
  return response;
}

/**
 * Remove prescription details if they shouldn't be shown
 */
export function removePrescriptionDetails(response: string, shouldShowPrescription: boolean): string {
  if (shouldShowPrescription) {
    return response;
  }
  
  // Remove prescription lists with bullet points
  let cleaned = response;
  
  // Remove "আপনার প্রেসক্রিপশনে নিম্নলিখিত ঔষধগুলি রয়েছে:" and following list
  // Use [\s\S] instead of . with s flag for compatibility
  cleaned = cleaned.replace(/আপনার প্রেসক্রিপশনে[\s\S]*?রয়েছে:\s*\d+\.[\s\S]*?(\n\n|$)/gi, '');
  
  // Remove prescription item lists (1. Medicine... 2. Medicine...)
  cleaned = cleaned.replace(/\d+\.\s*\*\*[A-Za-z0-9\s]+\*\*:[\s\S]*?(\n(?=\d+\.)|$)/gi, '');
  
  return cleaned.trim();
}

/**
 * Main post-processing function
 */
export function postProcessResponse(
  response: string, 
  userQuestion: string,
  isGeneralQuestion: boolean
): string {
  let processed = response;
  
  // 1. Fix missing question marks in follow-ups
  processed = fixQuestionMarks(processed);
  
  // 2. Remove inappropriate warnings for general/non-emergency questions
  if (isGeneralQuestion) {
    processed = removeInappropriateWarnings(processed, userQuestion);
  }
  
  // 3. Remove prescription details for general questions
  if (isGeneralQuestion) {
    processed = removePrescriptionDetails(processed, false);
  }
  
  // 4. Clean up extra whitespace
  processed = processed.replace(/\n{3,}/g, '\n\n');
  processed = processed.trim();
  
  return processed;
}

