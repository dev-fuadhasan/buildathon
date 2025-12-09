/**
 * Clinical Safety Guardrails for MomsCare AI
 * Detects red flags and dangerous situations that require immediate medical attention
 */

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type SafetyCheck = {
  riskLevel: RiskLevel;
  redFlags: string[];
  recommendation: string;
  requiresEmergency: boolean;
};

// Helpers
function isQuestionFormat(msg: string): boolean {
  const trimmed = msg.trim();
  if (trimmed.endsWith("?")) return true;
  return /^(how|what|when|why|is|are|can|could|should|would|will|do|does|did)\b/i.test(trimmed);
}

function hasPersonalIndicator(msg: string): boolean {
  return /\b(my|i |i'm|i am|i've|ami|amar)\b/i.test(msg);
}

// Red flag keywords and patterns
const CRITICAL_RED_FLAGS = [
  // Bleeding
  "heavy bleeding", "bleeding heavily", "bright red blood", "soaking pad",
  "vaginal bleeding", "bleeding with clots", "hemorrhage",
  
  // Severe pain
  "severe pain", "excruciating pain", "unbearable pain", "sharp pain",
  "stabbing pain", "constant pain", "pain won't stop",
  
  // No fetal movement
  "no movement", "baby not moving", "no kicks", "reduced movement",
  "decreased movement", "stopped moving",
  
  // Water breaking
  "water broke", "amniotic fluid", "fluid leaking", "gushing fluid",
  
  // High fever
  "high fever", "fever over", "temperature", "fever with",
  
  // Seizures/convulsions
  "seizure", "convulsion", "fitting", "unconscious",
  
  // Severe headache/vision
  "severe headache", "blurred vision", "vision problems", "seeing spots",
  "eclampsia", "preeclampsia",
  
  // Breathing issues
  "can't breathe", "difficulty breathing", "shortness of breath",
  "chest pain", "chest tightness",
  
  // Trauma
  "fell", "accident", "hit my", "hit her", "was hit", "got hit", "trauma", "injury",
  
  // Other emergencies
  "emergency", "urgent", "immediately", "right now", "asap",
];

const HIGH_RISK_FLAGS = [
  // Moderate bleeding
  "spotting", "light bleeding", "brown discharge", "pink discharge",
  
  // Moderate pain
  "moderate pain", "persistent pain", "cramping", "contractions",
  
  // Reduced movement
  "less movement", "slower movement", "movement decreased",
  
  // Symptoms
  "dizziness", "fainting", "nausea", "vomiting", "diarrhea",
  "swelling", "edema", "high blood pressure",
  
  // Infections
  "infection", "discharge", "odor", "burning", "itching",
  
  // Mental health
  "depression", "anxiety", "suicidal", "harm", "self harm",
];

const MEDIUM_RISK_FLAGS = [
  "mild pain", "slight discomfort", "tired", "fatigue",
  "backache", "headache", "constipation", "heartburn",
  "mood swings", "stress", "worry", "concern",
];

/**
 * Check if message is a routine pregnancy question (not an emergency)
 */
function isRoutineQuestion(message: string): boolean {
  const routinePatterns = [
    // Appointments and checkups
    /\b(appointment|checkup|check-up|visit|schedule|antenatal|prenatal|postnatal)\b/gi,
    /\b(how many|how much|kototi|kotota|kotogulo|koto)\b/gi,
    /\b(should i|can i|is it safe|is it okay|ami ki|ki kora)\b/gi,
    
    // Educational questions
    /\b(what is|what are|how does|how do|why|when should|ki|kemon|kivabe|kkhon)\b/gi,
    /\b(learn|know|understand|prepare|plan|jante|bujhte|shikha)\b/gi,
    
    // Routine pregnancy topics
    /\b(diet|nutrition|exercise|vitamins|supplements|food|khabar|khana)\b/gi,
    /\b(weight gain|baby movement|growth|development|bari|briddhi)\b/gi,
    /\b(scan|ultrasound|test|report|result|porikkha)\b/gi,
    
    // General advice
    /\b(advice|suggestion|recommend|tips|guide|poramorsho|upodesh)\b/gi,
  ];
  
  for (const pattern of routinePatterns) {
    if (pattern.test(message)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Analyzes user input for red flags and dangerous situations
 */
export function checkSafety(userMessage: string, profileContext?: string): SafetyCheck {
  const message = userMessage.toLowerCase();
  const context = (profileContext || "").toLowerCase();
  const combined = `${message} ${context}`;
  
  // Check if this is a routine question first
  const isRoutine = isRoutineQuestion(message);
  
  const criticalFlags: string[] = [];
  const highFlags: string[] = [];
  const mediumFlags: string[] = [];
  
  // Check for critical red flags
  for (const flag of CRITICAL_RED_FLAGS) {
    if (combined.includes(flag.toLowerCase())) {
      // If it's a routine question, only add VERY specific emergency keywords
      // Exclude generic words like "immediately", "urgent", "emergency" for routine questions
      const genericEmergencyWords = ["emergency", "urgent", "immediately", "right now", "asap"];
      
      if (isRoutine && genericEmergencyWords.includes(flag.toLowerCase())) {
        continue;
      }

      // If the user is asking an informational question (question format) and NOT using personal indicators,
      // treat as informational and NOT as an emergency report. This prevents false alarms for "how to know" questions.
      const questionLike = isQuestionFormat(userMessage) || isQuestionFormat(message);
      const personal = hasPersonalIndicator(userMessage);
      if (questionLike && !personal) {
        continue;
      }
      
      // If it's a specific medical emergency symptom reported personally, flag it
      criticalFlags.push(flag);
    }
  }
  
  // Check for high-risk flags (only if no critical flags)
  if (criticalFlags.length === 0) {
    for (const flag of HIGH_RISK_FLAGS) {
      if (combined.includes(flag.toLowerCase())) {
        highFlags.push(flag);
      }
    }
  }
  
  // Check for medium-risk flags (only if no higher risk flags)
  if (criticalFlags.length === 0 && highFlags.length === 0) {
    for (const flag of MEDIUM_RISK_FLAGS) {
      if (combined.includes(flag.toLowerCase())) {
        mediumFlags.push(flag);
      }
    }
  }
  
  // Determine risk level
  let riskLevel: RiskLevel = "low";
  let requiresEmergency = false;
  let recommendation = "";
  
  if (criticalFlags.length > 0) {
    riskLevel = "critical";
    requiresEmergency = true;
    recommendation = "🚨 CRITICAL: This requires IMMEDIATE medical attention. Please contact emergency services or go to the nearest hospital right away. Do not delay.";
  } else if (highFlags.length > 0) {
    riskLevel = "high";
    requiresEmergency = false;
    recommendation = "⚠️ HIGH PRIORITY: Please contact your healthcare provider as soon as possible. This may require medical evaluation.";
  } else if (mediumFlags.length > 0) {
    riskLevel = "medium";
    requiresEmergency = false;
    recommendation = "💡 MODERATE: Consider discussing this with your healthcare provider during your next visit, or call if symptoms worsen.";
  } else {
    riskLevel = "low";
    requiresEmergency = false;
    recommendation = "";
  }
  
  return {
    riskLevel,
    redFlags: [...criticalFlags, ...highFlags, ...mediumFlags],
    recommendation,
    requiresEmergency,
  };
}

/**
 * Enhances AI system prompt with safety guardrails
 */
export function getSafetyPrompt(): string {
  return `
CRITICAL SAFETY PROTOCOLS:
1. If a user reports ANY of these symptoms (not just asks about them), you MUST immediately recommend emergency medical care:
   - Heavy bleeding or bright red blood
   - Severe or excruciating pain
   - No fetal movement or significantly reduced movement
   - Water breaking (amniotic fluid leakage) WHEN THE USER SAYS IT IS HAPPENING TO THEM (not when asking how to identify)
   - High fever
   - Seizures or convulsions
   - Severe headache with vision problems
   - Difficulty breathing or chest pain
   - Trauma or injury
   - Any other emergency situation

2. For these symptoms, your response MUST:
   - Start with a clear emergency warning (🚨)
   - Explicitly state: "This requires IMMEDIATE medical attention"
   - Recommend contacting emergency services or going to the hospital
   - NOT provide any medical advice beyond seeking immediate care
   - NOT attempt to diagnose or treat

3. For high-risk symptoms (moderate bleeding, persistent pain, reduced movement, etc.):
   - Recommend contacting healthcare provider as soon as possible
   - Emphasize the importance of medical evaluation

4. Always prioritize safety over providing information. When in doubt, recommend medical consultation.
`;
}

