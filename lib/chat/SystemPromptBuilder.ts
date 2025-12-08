/**
 * Builds system prompts dynamically based on context
 * Single Responsibility: Prompt generation
 */

import { getUnifiedSystemPrompt } from "../safetyGuardrails";

export interface PromptContext {
  isLoggedIn: boolean;
  hasProfile: boolean;
  isGeneralQuestion: boolean;
  isPersonalQuestion: boolean;
  language: 'en' | 'bn';
  needsFollowUp: boolean;
}

/**
 * Build system prompt for logged-out users
 */
export function buildLoggedOutPrompt(language: 'en' | 'bn'): string {
  const basePrompt = getUnifiedSystemPrompt(false, false);
  
  const languageInstruction = language === 'bn'
    ? "\n\nIMPORTANT: Respond in Bangla (বাংলা). Use Bengali script."
    : "\n\nIMPORTANT: Respond in English.";
  
  return `${basePrompt}${languageInstruction}

MODE: Logged-out user
- No personal data available
- Provide general pregnancy advice
- If question is ambiguous, ask ONE clarifying question
- Keep answers short and helpful

Examples:
Q: "Pregnancy e ki vitamin khabo?"
A: "গর্ভাবস্থায় ফলিক এসিড, আয়রন, ক্যালসিয়াম খাওয়া উচিত..."`;
}

/**
 * Build system prompt for logged-in user with GENERAL question
 */
export function buildGeneralQuestionPrompt(language: 'en' | 'bn'): string {
  const basePrompt = getUnifiedSystemPrompt(true, false);
  
  const languageInstruction = language === 'bn'
    ? "\n\nIMPORTANT: Respond in Bangla (বাংলা)."
    : "\n\nIMPORTANT: Respond in English.";
  
  return `${basePrompt}${languageInstruction}

MODE: General Question (User is logged in but asking about mothers in general)
**CRITICAL: Profile context has been REMOVED. You have NO access to personal data.**

Rules:
- Answer as educational/informational content
- NO personal data, prescriptions, or user-specific details
- NO emergency warnings unless question mentions specific emergency
- Treat as if user is logged out

Examples:
Q: "mayera ki ki mene cholbe?"
A: "গর্ভবতী মায়েদের পুষ্টিকর খাবার খান, বিশ্রাম নিন, চেকআপ করান..."

Q: "pregnancy e vari jinis tola thik?"
A: "গর্ভাবস্থায় ভারী জিনিস তোলা এড়িয়ে চলা ভালো..."`;
}

/**
 * Build system prompt for logged-in user with PERSONAL question
 */
export function buildPersonalQuestionPrompt(
  language: 'en' | 'bn',
  needsFollowUp: boolean
): string {
  const basePrompt = getUnifiedSystemPrompt(true, true);
  
  const languageInstruction = language === 'bn'
    ? "\n\nIMPORTANT: Respond in Bangla (বাংলা)."
    : "\n\nIMPORTANT: Respond in English.";
  
  const followUpInstruction = needsFollowUp
    ? "\n\n**FOLLOW-UP REQUIRED**: This question is ambiguous. Ask ONE clarifying question FIRST before answering."
    : "";
  
  return `${basePrompt}${languageInstruction}${followUpInstruction}

MODE: Personal Question (User asking about herself)
- Use profile data quietly to personalize answer
- NEVER list prescription details unless user asks "amar prescription ki?"
- Consider her week, conditions, symptoms
- If ambiguous, ask follow-up first

Examples:
Q: "amar ki alargy medicine dorkar?"
A: "কি ধরনের অ্যালার্জি? লক্ষণ কি?" (Ask follow-up FIRST)

Q: "amar pet betha korche" 
A: "কোথায় ব্যথা? কতক্ষণ ধরে?" (Ask follow-up FIRST)`;
}

/**
 * Main builder - routes to appropriate prompt based on context
 */
export function buildSystemPrompt(context: PromptContext): string {
  if (!context.isLoggedIn) {
    return buildLoggedOutPrompt(context.language);
  }
  
  if (context.isGeneralQuestion) {
    return buildGeneralQuestionPrompt(context.language);
  }
  
  if (context.isPersonalQuestion) {
    return buildPersonalQuestionPrompt(context.language, context.needsFollowUp);
  }
  
  // Default to general
  return buildGeneralQuestionPrompt(context.language);
}

