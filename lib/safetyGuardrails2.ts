'use client';

/**
 * SAFETY GUARDRAILS FOR MATERNAL HEALTHCARE
 * ==========================================
 * 
 * - Emergency symptom detection (runs instantly)
 * - Risk classification (low/normal/high/emergency)
 * - Graceful fallback when AI/embeddings fail
 * - HIPAA-compliant error handling
 * 
 * This layer runs INDEPENDENTLY of AI and embeddings.
 */

export interface SafetyResult {
  isSafe: boolean;
  riskLevel: 'low' | 'normal' | 'high' | 'emergency';
  requiresImmediate: boolean;
  warnings: string[];
  recommendations: string[];
  shouldAlertUser: boolean;
  shouldCallEmergency: boolean;
}

// ============================================================================
// EMERGENCY SYMPTOM PATTERNS
// ============================================================================

const EMERGENCY_PATTERNS = [
  // Bleeding
  /\b(bleed|bleeding|hemorrhage|heavy flow|clot|miscarriage|abort)\b/gi,
  // Severe pain
  /\b(severe|excruciating|unbearable|intense|sharp pain|sharp cramp)\b/gi,
  // Vital signs
  /\b(high blood pressure|eclampsia|preeclampsia|seizure|convulsion)\b/gi,
  // Consciousness
  /\b(faint|fainting|unconscious|loss of consciousness|dizzy|black out)\b/gi,
  // Severe infection
  /\b(fever 104|fever 40c|sepsis|infection|chills)\b/gi,
  // Labor complications
  /\b(prolonged labor|no contractions|cord prolapse|placental abruption)\b/gi,
  // Other life-threatening
  /\b(breathless|can't breathe|chest pain|heart attack|stroke)\b/gi,
];

const HIGH_RISK_PATTERNS = [
  // Gestational diabetes
  /\b(gestational diabetes|glucose|blood sugar high|hyperglycemia)\b/gi,
  // Preeclampsia signs
  /\b(swelling|edema|proteinuria|headache|vision change|upper abdomen pain)\b/gi,
  // Severe nausea
  /\b(hyperemesis|severe vomiting|cannot keep down|dehydrated)\b/gi,
  // Infection signs
  /\b(fever|chills|painful urination|discharge|infection)\b/gi,
  // Concerning bleeding
  /\b(spotting|light bleeding|brown discharge)\b/gi,
];

// ============================================================================
// SAFETY DETECTION
// ============================================================================

/**
 * Check for emergency symptoms
 * Returns true if any emergency pattern matches
 */
function hasEmergencySymptoms(text: string): boolean {
  for (const pattern of EMERGENCY_PATTERNS) {
    if (pattern.test(text)) {
      console.log(`[Safety] Emergency symptom detected: ${pattern.source}`);
      return true;
    }
  }
  return false;
}

/**
 * Check for high-risk symptoms
 * Returns true if any high-risk pattern matches
 */
function hasHighRiskSymptoms(text: string): boolean {
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(text)) {
      console.log(`[Safety] High-risk symptom detected: ${pattern.source}`);
      return true;
    }
  }
  return false;
}

/**
 * Detect risk factors from user text
 */
function extractRiskFactors(text: string): string[] {
  const factors: string[] = [];
  const textLower = text.toLowerCase();

  // Age factors
  if (/\b(16|17|18|19|20|21|22|23|24)\b/i.test(text) || textLower.includes('teen')) {
    factors.push('Young maternal age');
  }
  if (/\b(35|36|37|38|39|40|41|42|43|44|45)\b/i.test(text) || textLower.includes('advanced age')) {
    factors.push('Advanced maternal age');
  }

  // Previous complications
  if (textLower.includes('previous miscarriage') || textLower.includes('previous loss')) {
    factors.push('History of miscarriage');
  }
  if (textLower.includes('previous c-section') || textLower.includes('previous cesarean')) {
    factors.push('Previous cesarean delivery');
  }

  // Chronic conditions
  if (textLower.includes('diabetes')) factors.push('Diabetes');
  if (textLower.includes('hypertension') || textLower.includes('high blood pressure')) {
    factors.push('Hypertension');
  }
  if (textLower.includes('obesity') || textLower.includes('overweight')) {
    factors.push('Weight concerns');
  }

  return factors;
}

/**
 * Main safety assessment
 */
export function assessSafety(userMessage: string): SafetyResult {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let riskLevel: 'low' | 'normal' | 'high' | 'emergency' = 'normal';
  let requiresImmediate = false;
  let shouldAlertUser = false;
  let shouldCallEmergency = false;

  // Check for emergency symptoms
  if (hasEmergencySymptoms(userMessage)) {
    riskLevel = 'emergency';
    requiresImmediate = true;
    shouldAlertUser = true;
    shouldCallEmergency = true;
    warnings.push('⚠️  EMERGENCY SYMPTOMS DETECTED');
    recommendations.push('🚨 Call emergency services (911 or local number) immediately');
    recommendations.push('Do not wait for AI response - seek immediate medical help');
  } else if (hasHighRiskSymptoms(userMessage)) {
    riskLevel = 'high';
    shouldAlertUser = true;
    warnings.push('⚠️  High-risk symptoms detected');
    recommendations.push('Schedule an urgent appointment with your healthcare provider');
    recommendations.push('If symptoms worsen, call emergency services');
  }

  // Extract risk factors
  const riskFactors = extractRiskFactors(userMessage);
  if (riskFactors.length > 0) {
    if (riskLevel === 'normal') riskLevel = 'high';
    recommendations.push(`Known risk factors: ${riskFactors.join(', ')}`);
    recommendations.push('Discuss these with your healthcare provider');
  }

  // Provide general recommendations
  if (riskLevel === 'normal') {
    recommendations.push('Contact your doctor if symptoms persist');
    recommendations.push('Keep regular prenatal check-ups');
  }

  return {
    isSafe: riskLevel !== 'emergency',
    riskLevel,
    requiresImmediate,
    warnings,
    recommendations,
    shouldAlertUser,
    shouldCallEmergency,
  };
}

// ============================================================================
// FALLBACK RESPONSES (When AI/Embeddings Fail)
// ============================================================================

const FALLBACK_RESPONSES: Record<string, string> = {
  bleeding: `Vaginal bleeding during pregnancy can be concerning. 
  
  Seek immediate medical attention if:
  • Heavy bleeding (soaking pads)
  • Accompanied by severe pain or cramping
  • Accompanied by dizziness or fainting
  
  Call your doctor or go to the ER. Do not delay.`,

  pain: `Abdominal or pelvic pain needs evaluation.
  
  Seek immediate help if:
  • Severe, sharp, or persistent pain
  • Accompanied by bleeding or fluid loss
  • Accompanied by fever or chills
  
  Contact your healthcare provider or ER.`,

  fever: `Fever during pregnancy requires attention.
  
  Seek medical help if:
  • Fever above 101°F (38.3°C)
  • Fever lasting more than 24 hours
  • Accompanied by body aches or chills
  
  Call your doctor for guidance.`,

  swelling: `Some swelling is normal in pregnancy, but...
  
  Seek immediate help if:
  • Sudden, severe swelling
  • Accompanied by headache or vision changes
  • Only on one leg with redness/warmth
  
  Contact your healthcare provider.`,

  nausea: `Nausea is common in pregnancy but monitor severity.
  
  Seek help if:
  • Cannot keep any food or fluids down
  • Losing weight
  • Dizzy or fainting
  
  Call your doctor about these symptoms.`,

  default: `I'm having trouble accessing the full knowledge base right now, but I want to help you stay safe.

For pregnancy concerns:
• Contact your OB/GYN or midwife
• Call your local maternal health line
• Go to the nearest hospital if symptoms are severe
• Emergency: Call 911 or your local emergency number

Please don't delay seeking professional medical advice.`,
};

/**
 * Get appropriate fallback response based on symptom type
 */
export function getFallbackResponse(userMessage: string): string {
  const messageLower = userMessage.toLowerCase();

  if (messageLower.includes('bleed')) return FALLBACK_RESPONSES.bleeding;
  if (messageLower.includes('pain')) return FALLBACK_RESPONSES.pain;
  if (messageLower.includes('fever')) return FALLBACK_RESPONSES.fever;
  if (messageLower.includes('swell')) return FALLBACK_RESPONSES.swelling;
  if (messageLower.includes('nausea') || messageLower.includes('vomit')) {
    return FALLBACK_RESPONSES.nausea;
  }

  return FALLBACK_RESPONSES.default;
}

// ============================================================================
// RESPONSE SAFETY CHECK (Before sending to user)
// ============================================================================

/**
 * Verify AI response doesn't give dangerous medical advice
 */
export function validateAIResponse(
  response: string,
  userMessage: string
): { isValid: boolean; warning?: string } {
  // Check if response tells user to ignore emergency symptoms
  if (/ignore|dont worry|no need to see doctor|wait|stay home/.test(response) &&
      hasEmergencySymptoms(userMessage)) {
    return {
      isValid: false,
      warning: 'Response contradicts safety requirements for emergency symptoms',
    };
  }

  // Check if response provides drug recommendations without disclaimers
  if (/take.*medicine|take.*drug|use.*medication/.test(response)) {
    if (!/consult|doctor|provider|medical professional/.test(response)) {
      return {
        isValid: false,
        warning: 'Response recommends medication without professional guidance disclaimer',
      };
    }
  }

  return { isValid: true };
}

// ============================================================================
// FALLBACK CONTEXT FOR AI
// ============================================================================

/**
 * Generate safe context for AI when vector DB is unavailable
 */
export function getEmergencyFallbackContext(
  userMessage: string
): { context: string; isEmergency: boolean } {
  const safety = assessSafety(userMessage);

  if (safety.shouldCallEmergency) {
    return {
      context: `EMERGENCY ALERT: User is describing potential medical emergency. 
        Priority: Immediate professional help. 
        Do NOT provide routine advice.
        Recommendations: ${safety.recommendations.join(' | ')}`,
      isEmergency: true,
    };
  }

  if (safety.shouldAlertUser) {
    return {
      context: `HIGH RISK ALERT: User describing high-risk symptoms.
        Risk Level: ${safety.riskLevel}.
        Urge medical consultation.
        Risk Factors: ${safety.warnings.join(' | ')}`,
      isEmergency: false,
    };
  }

  return {
    context: '',
    isEmergency: false,
  };
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

export interface ErrorHandlingResult {
  userMessage: string;
  shouldUseAI: boolean;
  shouldUseFallback: boolean;
  fallbackResponse?: string;
  emergencyAlert?: string;
}

/**
 * Central error handler: Decides on best response when system fails
 */
export function handleSystemError(
  userMessage: string,
  errors: {
    embeddingFailed?: boolean;
    vectorDBFailed?: boolean;
    aiFailed?: boolean;
  }
): ErrorHandlingResult {
  const safety = assessSafety(userMessage);

  // Emergency takes priority - must respond immediately
  if (safety.shouldCallEmergency) {
    return {
      userMessage,
      shouldUseAI: false,
      shouldUseFallback: true,
      fallbackResponse: safety.recommendations.join('\n'),
      emergencyAlert: '🚨 EMERGENCY DETECTED - User needs immediate help',
    };
  }

  // If embeddings failed but AI is working, use AI without context
  if (errors.embeddingFailed && !errors.aiFailed) {
    return {
      userMessage,
      shouldUseAI: true,
      shouldUseFallback: false,
    };
  }

  // If both embedding and AI failed, use fallback
  if (errors.embeddingFailed && errors.aiFailed) {
    return {
      userMessage,
      shouldUseAI: false,
      shouldUseFallback: true,
      fallbackResponse: getFallbackResponse(userMessage),
    };
  }

  // Default: Try AI with whatever context we have
  return {
    userMessage,
    shouldUseAI: true,
    shouldUseFallback: false,
  };
}

/**
 * Log safety events for monitoring
 */
export interface SafetyEvent {
  timestamp: string;
  riskLevel: string;
  message: string;
  action: string;
}

export function logSafetyEvent(event: SafetyEvent): void {
  console.log(
    `[Safety Event] ${event.timestamp} | Level: ${event.riskLevel} | Action: ${event.action}`
  );

  // In production, send to monitoring service
  if (typeof window === 'undefined') {
    // Server-side: could send to Sentry, Datadog, etc.
  } else {
    // Client-side: could log to service
  }
}
