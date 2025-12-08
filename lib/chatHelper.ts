/**
 * Helper functions for chat functionality
 */

/**
 * Detects if a question is personal (about the user) or general
 * Returns true if personal, false if general
 */
export function isPersonalQuestion(message: string): boolean {
  const text = message.toLowerCase().trim();
  
  // Personal indicators (Bengali and English)
  const personalKeywords = [
    // Bengali personal pronouns and possessive
    "amar", "amake", "amader", "amar baby", "amar pregnancy", 
    "amar report", "amar bp", "amar problem", "amar jonno",
    "amar kache", "amar sathe", "amar somporke",
    
    // English personal pronouns and possessive
    "my", "me", "i", "myself", "my baby", "my pregnancy",
    "my report", "my bp", "my problem", "for me",
    
    // Personal medical references
    "amake ki", "amar ki", "amar hoyeche", "amar ache",
    "what should i", "what can i", "should i", "can i",
    "amake korte hobe", "amar kora uchit",
    
    // Direct personal questions
    "amar somporke", "amar bare", "about me", "about my",
  ];
  
  // General indicators
  const generalKeywords = [
    // Bengali general terms
    "general", "onek ma", "onnoder", "dhori", "jodi kono",
    "if some mother", "if a mother", "ekjon ma",
    "proshno", "jante chai", "janar jonno",
    
    // English general terms
    "generally", "in general", "other mothers", "some mothers",
    "if someone", "if a woman", "what if", "suppose",
    "hypothetically", "for example",
    
    // Question patterns that are usually general
    "what is", "what are", "why do", "how do", "when do",
    "ki hote pare", "kemon hoy", "keno hoy",
  ];
  
  // Check for personal keywords first (higher priority)
  const hasPersonalKeyword = personalKeywords.some(keyword => 
    text.includes(keyword)
  );
  
  // Check for general keywords
  const hasGeneralKeyword = generalKeywords.some(keyword => 
    text.includes(keyword)
  );
  
  // If explicit general keyword found, it's general
  if (hasGeneralKeyword && !hasPersonalKeyword) {
    return false;
  }
  
  // If personal keyword found, it's personal
  if (hasPersonalKeyword) {
    return true;
  }
  
  // Default: if no clear indicators, check question structure
  // Questions starting with "what is", "what are", "why", "how" are often general
  const generalQuestionPatterns = /^(what is|what are|why do|how do|when do|ki|keno|kemon)/i;
  if (generalQuestionPatterns.test(text) && !hasPersonalKeyword) {
    return false;
  }
  
  // If question contains symptoms or medical terms without personal pronouns,
  // it might be general, but we'll default to personal if user is logged in
  // (this will be handled by the backend based on login status)
  
  // Default to personal if ambiguous (safer for logged-in users)
  return true;
}

