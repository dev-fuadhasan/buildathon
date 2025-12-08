/**
 * Classifies questions as general or personal
 * Single Responsibility: Question type detection
 */

export type QuestionType = 'general' | 'personal' | 'ambiguous';

export interface QuestionClassification {
  type: QuestionType;
  needsFollowUp: boolean;
  reason: string;
}

/**
 * Classify if question is general or personal
 */
export function classifyQuestion(
  question: string,
  isLoggedIn: boolean
): QuestionClassification {
  const lowerQuestion = question.toLowerCase();
  
  // General keywords (asking about mothers/people in general)
  const generalKeywords = [
    'mayera', 'gorbhoboti', 'gorbho boti', 'pregnant women', 'mothers',
    'manush', 'people', 'ki ki', 'kemon', 'kivabe', 'what should',
    'meyera', 'mohilader', 'mahilader'
  ];
  
  // Personal keywords (asking about herself)
  const personalKeywords = [
    'amar', 'amake', 'ami', 'my', 'I have', 'I am', 'আমার', 'আমি', 'আমাকে'
  ];
  
  // Ambiguous keywords (need follow-up)
  const ambiguousKeywords = [
    'medicine', 'oshudh', 'khabo', 'khawa', 'should I take',
    'dorkar', 'lagbe', 'need'
  ];
  
  // Check for general keywords
  const hasGeneral = generalKeywords.some(kw => lowerQuestion.includes(kw));
  const hasPersonal = personalKeywords.some(kw => lowerQuestion.includes(kw));
  const hasAmbiguous = ambiguousKeywords.some(kw => lowerQuestion.includes(kw));
  
  // Classification logic
  if (hasGeneral && !hasPersonal) {
    return {
      type: 'general',
      needsFollowUp: false,
      reason: 'Question asks about mothers/people in general'
    };
  }
  
  if (hasPersonal) {
    // Check if it's ambiguous (needs follow-up)
    const isAmbiguous = hasAmbiguous && (
      !lowerQuestion.includes('allergy') && 
      !lowerQuestion.includes('betha') &&
      !lowerQuestion.includes('pain')
    );
    
    return {
      type: 'personal',
      needsFollowUp: isAmbiguous,
      reason: hasAmbiguous ? 'Personal question needs clarification' : 'Personal question'
    };
  }
  
  // If logged out, treat as general
  if (!isLoggedIn) {
    return {
      type: 'general',
      needsFollowUp: false,
      reason: 'User not logged in'
    };
  }
  
  // Default to general if unclear
  return {
    type: 'general',
    needsFollowUp: false,
    reason: 'No clear personal indicators'
  };
}

/**
 * Check if question needs follow-up clarification
 */
export function needsFollowUpQuestion(question: string): {needed: boolean; reason: string} {
  const lowerQuestion = question.toLowerCase();
  
  // Medicine questions without condition
  if ((lowerQuestion.includes('medicine') || lowerQuestion.includes('oshudh')) &&
      !lowerQuestion.includes('allergy') && !lowerQuestion.includes('allargi') &&
      !lowerQuestion.includes('fever') && !lowerQuestion.includes('jor')) {
    return {needed: true, reason: 'Medicine question needs condition'};
  }
  
  // Pain without location
  if ((lowerQuestion.includes('betha') || lowerQuestion.includes('pain')) &&
      !lowerQuestion.includes('pet') && !lowerQuestion.includes('matha') &&
      !lowerQuestion.includes('head') && !lowerQuestion.includes('back')) {
    return {needed: true, reason: 'Pain needs location'};
  }
  
  // Discharge without details
  if (lowerQuestion.includes('discharge') &&
      !lowerQuestion.includes('white') && !lowerQuestion.includes('sada') &&
      !lowerQuestion.includes('yellow') && !lowerQuestion.includes('holud')) {
    return {needed: true, reason: 'Discharge needs details'};
  }
  
  return {needed: false, reason: 'Question is clear'};
}

