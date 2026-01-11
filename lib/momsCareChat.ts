import { groq, isGroqConfigured } from "./groqClient";
import { getSafetyPrompt } from "./safetyGuardrails";
import { retrieveRelevantGuidelines, formatGuidelinesForContext } from "./medicalKnowledge";
import { searchDatasetByLanguage, searchDatasetDual, searchDatasetHybrid, formatDatasetContext, type Language } from "./dualDatasetLoader";
import { detectLanguage, translateToEnglish } from "./translation";
import { getForcedLanguage } from "./datasetConfig";
import { shouldUseProfileData, needsFollowUpQuestions } from "./chatHelper";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// Helper function to detect question type for formatting
function detectQuestionType(message: string): 'simple' | 'list' | 'how-to' | 'why' | 'what' | 'complex' {
  const lower = message.toLowerCase();
  
  // List questions
  if (/\b(which|what|ki ki|kon kon|list|name|examples|items?|things?)\b/.test(lower)) {
    return 'list';
  }
  
  // How-to questions
  if (/\b(how|kivabe|way|steps?|process|method|procedure)\b/.test(lower)) {
    return 'how-to';
  }
  
  // Why questions
  if (/\b(why|keno|reason|cause|because)\b/.test(lower)) {
    return 'why';
  }
  
  // What/definition questions
  if (/\b(what is|what are|ki|definition|meaning|explain)\b/.test(lower)) {
    return 'what';
  }
  
  // Complex questions (multiple parts or long)
  if (message.length > 100 || /\b(and|or|also|additionally|moreover)\b/.test(lower)) {
    return 'complex';
  }
  
  return 'simple';
}

// Format response as a list
function formatAsList(text: string): string {
  // Try to find numbered or bulleted items
  if (/\d+\./.test(text) || /[-•]/.test(text)) {
    return text; // Already has list format
  }
  
  // Try to extract list items from sentences
  const sentences = text.split(/([.!?]\s+)/);
  const items: string[] = [];
  let currentItem = '';
  
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i] + (sentences[i + 1] || '');
    // If sentence contains list indicators or is short, treat as item
    if (sentence.match(/\b(like|such as|including|for example|e\.g\.|namely)\b/i) || sentence.length < 100) {
      if (currentItem) items.push(currentItem.trim());
      currentItem = sentence.trim();
    } else {
      currentItem += sentence;
    }
  }
  if (currentItem) items.push(currentItem.trim());
  
  if (items.length > 1) {
    return `**Introduction:**\n${items[0]}\n\n**The List:**\n${items.slice(1).map((item, i) => `${i + 1}. ${item}`).join('\n')}`;
  }
  
  return breakIntoSentences(text);
}

// Format response as step-by-step
function formatAsSteps(text: string): string {
  if (/Step \d+:|step \d+:/i.test(text)) {
    return text; // Already formatted
  }
  
  const sentences = text.split(/([.!?]\s+)/).filter(s => s.trim().length > 0);
  const steps: string[] = [];
  let currentStep = '';
  
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i] + (sentences[i + 1] || '');
    // Short sentences or sentences with action words are likely steps
    if (sentence.length < 150 || /\b(first|then|next|after|now|start|begin|continue|finally)\b/i.test(sentence)) {
      if (currentStep) {
        steps.push(currentStep.trim());
        currentStep = sentence.trim();
      } else {
        currentStep = sentence.trim();
      }
    } else {
      currentStep += ' ' + sentence;
    }
  }
  if (currentStep) steps.push(currentStep.trim());
  
  if (steps.length > 1) {
    return `**Overview:**\n${steps[0]}\n\n**Step-by-Step Instructions:**\n${steps.slice(1).map((step, i) => `Step ${i + 1}: ${step}`).join('\n\n')}`;
  }
  
  return breakIntoSentences(text);
}

// Format response as sections
function formatAsSections(text: string): string {
  if (/\*\*[^*]+\*\*/.test(text)) {
    return text; // Already has sections
  }
  
  const sentences = text.split(/([.!?]\s+)/).filter(s => s.trim().length > 0);
  const sections: string[] = [];
  let currentSection = '';
  
  // Group sentences into logical sections (every 2-3 sentences)
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i] + (sentences[i + 1] || '');
    currentSection += sentence;
    
    // Create section every 2-3 sentences or at transition words
    if ((sections.length === 0 && currentSection.length > 200) || 
        (sections.length > 0 && (currentSection.length > 150 || /\b(however|moreover|additionally|also|furthermore|in addition|meanwhile|therefore|thus|hence|consequently|for example|for instance|specifically|in particular|in summary|to summarize|in conclusion|finally|lastly|first|second|third|next|then|after that|on the other hand|in contrast|similarly|likewise|as a result|as a consequence|in other words|that is)\b/i.test(currentSection)))) {
      sections.push(currentSection.trim());
      currentSection = '';
    }
  }
  if (currentSection) sections.push(currentSection.trim());
  
  if (sections.length > 1) {
    const sectionHeaders = ['Quick Answer', 'Detailed Explanation', 'Practical Recommendations', 'Important Notes'];
    return sections.map((section, i) => {
      const header = sectionHeaders[i] || `Section ${i + 1}`;
      return `**${header}:**\n${section}`;
    }).join('\n\n');
  }
  
  return breakIntoSentences(text);
}

// Break text into sentences with proper spacing
function breakIntoSentences(text: string): string {
  // Break at sentence boundaries
  let formatted = text.replace(/([.!?])\s+([A-Z\u0980-\u09FF])/g, (match, punct, letter) => {
    // Always add line break for better readability
    return `${punct}\n\n${letter}`;
  });
  
  // Ensure no more than 2 consecutive newlines
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  return formatted;
}

// In-memory cache for compact mother profiles (per motherId)
// Not persisted; safe for short-lived performance boost
const profileCache = new Map<string, {
  summary: string;
  bloodGroup?: string;
  weeks?: number;
  dueDate?: string;
  conditions?: string;
  medications?: string;
  lastUpdated: number;
}>();

const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function setProfileCache(motherId: string, data: {
  summary: string;
  bloodGroup?: string;
  weeks?: number;
  dueDate?: string;
  conditions?: string;
  medications?: string;
}) {
  profileCache.set(motherId, { ...data, lastUpdated: Date.now() });
}

function getProfileCache(motherId: string) {
  const entry = profileCache.get(motherId);
  if (!entry) return null;
  if (Date.now() - entry.lastUpdated > PROFILE_CACHE_TTL_MS) {
    profileCache.delete(motherId);
    return null;
  }
  return entry;
}

type ContextDecision = {
  useProfile: boolean;
  usePrescriptions: boolean;
  useDaily: boolean;
  useDoctorQA: boolean;
};

async function decideContextNeeds(
  userMessage: string,
  isPersonal: boolean,
  hasImages: boolean,
  hasProfileContext: boolean,
  hasDaily: boolean,
  hasDoctorQA: boolean
): Promise<ContextDecision> {
  // Default/fallback decision
  const fallback: ContextDecision = {
    useProfile: isPersonal && hasProfileContext,
    usePrescriptions: hasImages,
    useDaily: isPersonal && hasDaily,
    useDoctorQA: isPersonal && hasDoctorQA,
  };

  if (!isGroqConfigured()) {
    return fallback;
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are a medical assistant. Decide which context sources to load to answer the user's question. Be efficient: include only what is likely useful.\nRespond in JSON ONLY:\n{\n  "useProfile": true/false,\n  "usePrescriptions": true/false,\n  "useDaily": true/false,\n  "useDoctorQA": true/false\n}\nGuidance:\n- If question is personal about the user and health → likely use profile.\n- If symptoms/meds/reports/prescriptions mentioned → consider prescriptions.\n- If question about habits, mood, sleep, diet, daily symptoms → consider daily.\n- If question about prior doctor advice → consider doctorQA.\n- If general/educational → usually skip.\nKeep answers short. JSON only.`,
        },
        {
          role: "user",
          content: `Question: ${userMessage}\nIs personal: ${isPersonal}\nHas images uploaded: ${hasImages}\nAvailable: profile=${hasProfileContext}, daily=${hasDaily}, doctorQA=${hasDoctorQA}\nWhich contexts should be included?`,
        },
      ],
      temperature: 0.1,
      max_tokens: 80,
    });

    const resp = completion.choices?.[0]?.message?.content?.trim() || "";
    const match = resp.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]);

    const decision: ContextDecision = {
      useProfile: !!parsed.useProfile && hasProfileContext,
      usePrescriptions: !!parsed.usePrescriptions && hasImages,
      useDaily: !!parsed.useDaily && hasDaily,
      useDoctorQA: !!parsed.useDoctorQA && hasDoctorQA,
    };

    console.log(`[Context Decision] profile=${decision.useProfile} prescriptions=${decision.usePrescriptions} daily=${decision.useDaily} doctorQA=${decision.useDoctorQA}`);
    return decision;
  } catch (err) {
    console.error("[Context Decision] AI failed, using fallback:", (err as any)?.message);
    return fallback;
  }
}

/**
 * Ask the MomsCare assistant a question with optional profile context and prescription images.
 * Completely rewritten for better accuracy, relevance, and response quality.
 */
export async function askMomsCare(
  messages: Array<{ role: string; content: string }>,
  profileContext?: string,
  prescriptionUrls?: string[],
  weeksPregnant?: number,
  isPersonal?: boolean,
  isLoggedIn?: boolean,
  extraContexts?: {
    dailyContext?: string;
    doctorQAContext?: string;
    motherId?: string;
    translatedQuery?: string; // Pre-translated query to avoid duplicate translation
  }
): Promise<string> {
  if (!isGroqConfigured()) {
    throw new Error("Groq API is not configured. Please set GROQ_API_KEY environment variable.");
  }

  try {
    const safetyPrompt = getSafetyPrompt();
    
    // ==========================================
    // STEP 1: Get last user message for processing
    // ==========================================
    const lastUserMessage = messages
      .filter((m) => m.role === "user")
      .pop()?.content || "";
    
    // ==========================================
    // STEP 2: Detect language from user message (or use forced language from config)
    // ==========================================
    const forcedLanguage = getForcedLanguage();
    const userLanguage = (forcedLanguage || detectLanguage(lastUserMessage)) as Language;
    
    // Response language instruction: Match user's input language
    const languageInstruction = userLanguage === "bn"
      ? "\n\nIMPORTANT LANGUAGE RULE: The user is writing in Bangla or Banglish. You MUST respond in Bangla (বাংলা). Use Bengali script for your entire response."
      : "\n\nIMPORTANT LANGUAGE RULE: The user is writing in English. You MUST respond in English.";
    
    // ==========================================
    // STEP 3: Search dual dataset based on language
    // ==========================================
    // For better search results: Translate Banglish to English for search
    // But always respond in the user's original language
    // ==========================================
    
    // Check if query is Banglish (romanized Bangla without Bengali script)
    const hasBengaliScript = /[\u0980-\u09FF]/.test(lastUserMessage);
    const isBanglish = userLanguage === "bn" && !hasBengaliScript;
    
    let relevantDatasetItems: any[] = [];
    let searchQuery = lastUserMessage; // Default: use original query
    
    if (isBanglish) {
      // 🎯 For Banglish: Translate to English for better search, then search with translated query
      console.log(`[Dual Search] Banglish detected: "${lastUserMessage}"`);
      
      // Use pre-translated query if available (to avoid duplicate translation)
      let translatedQuery = extraContexts?.translatedQuery;
      
      if (!translatedQuery) {
        // Only translate if not already provided
        try {
          translatedQuery = await translateToEnglish(lastUserMessage);
          console.log(`[Dual Search] Translated to English for search: "${translatedQuery}"`);
        } catch (error) {
          console.error(`[Dual Search] Translation failed, using original Banglish:`, error);
          // Fallback: use semantic search with English (works well for Banglish)
          relevantDatasetItems = await searchDatasetHybrid(lastUserMessage, "en", 3);
        }
      } else {
        console.log(`[Dual Search] Using pre-translated query: "${translatedQuery}"`);
      }
      
      if (translatedQuery) {
        searchQuery = translatedQuery; // Use translated query for search
        // Use semantic search (with keyword fallback) for better results
        relevantDatasetItems = await searchDatasetHybrid(translatedQuery, "en", 3);
      }
    } else if (userLanguage === "en") {
      // English query: Use semantic search (with keyword fallback)
      relevantDatasetItems = await searchDatasetHybrid(lastUserMessage, "en", 3);
    } else {
      // Bangla with script: Use semantic search (with keyword fallback)
      relevantDatasetItems = await searchDatasetHybrid(lastUserMessage, "bn", 3);
    }
    
    const datasetContext = relevantDatasetItems.length > 0 
      ? "\n\n" + formatDatasetContext(relevantDatasetItems, userLanguage) // Format in user's expected language
      : "";
    
    // Log language and response expectation
    console.log(`[Language] User input language: ${userLanguage} (${isBanglish ? 'Banglish' : hasBengaliScript ? 'Bangla with script' : 'English'})`);
    console.log(`[Language] Expected response language: ${userLanguage === "bn" ? "Bangla (বাংলা)" : "English"}`);
    
    // Log dataset context usage for debugging
    if (relevantDatasetItems.length > 0) {
      console.log(`[Dataset] Using ${relevantDatasetItems.length} reference Q&A for context`);
      relevantDatasetItems.forEach((item, i) => {
        const question = userLanguage === "en" ? item.question_en : item.question_bn;
        console.log(`  ${i+1}. ${question.substring(0, 80)}...`);
      });
    } else {
      console.log(`[Dataset] No relevant Q&A found - AI will use its own knowledge`);
    }
    
    // Check if image is provided
    const hasImage = prescriptionUrls && prescriptionUrls.length > 0;
    
    // ==========================================
    // AI-BASED DECISIONS
    // ==========================================
    
    // Available extra contexts (already filtered by question classifier)
    const dailyContextRaw = extraContexts?.dailyContext;
    const doctorQAContextRaw = extraContexts?.doctorQAContext;
    const motherId = extraContexts?.motherId;

    // Use provided context as-is (already filtered before calling this function)
    let actualProfileContext: string | undefined = profileContext;
    
    console.log(`[Context Usage] Profile: ${!!actualProfileContext}, Daily: ${!!dailyContextRaw}, DoctorQA: ${!!doctorQAContextRaw}, Prescriptions: ${prescriptionUrls?.length || 0}`);
    
    // Let AI naturally decide if follow-up questions are needed (no extra AI call)
    const followUpInstruction = "";
    
    // AI will intelligently detect question type - no keyword matching needed
    // The system prompt will handle understanding intent
    
    // Debug logging
    console.log(`[AI Mode] HasImage: ${hasImage}, IsPersonal: ${isPersonal}, IsLoggedIn: ${isLoggedIn}, UseProfile: ${!!actualProfileContext}`);
    
    const imageInstruction = hasImage 
      ? `\n\nCRITICAL - PRESCRIPTION/REPORT IMAGES PROVIDED: The user has ${prescriptionUrls!.length} prescription/medical report image(s) attached. You MUST analyze these images carefully and provide specific, detailed guidance based on what you see in the images. If the user asks for a summary, analyze all images and provide a comprehensive summary. If they ask about medications, dosages, test results, or any medical information, extract and explain it from the images. DO NOT say you don't have access to their prescriptions - you DO have access through these images.`
      : "";
    
    // Language-aware messages
    const greetingResponse = userLanguage === "bn"
      ? 'হাই! আমি MomsCare AI। আমি গর্ভাবস্থা এবং স্বাস্থ্য সম্পর্কিত প্রশ্নে সাহায্য করতে পারি। আপনি কী জানতে চান?'
      : 'Hi! I\'m MomsCare AI. I can help you with pregnancy and health-related questions. What would you like to know?';
    
    const thanksResponse = userLanguage === "bn"
      ? 'আপনাকে স্বাগতম! আর কোনো প্রশ্ন থাকলে জানাবেন।'
      : 'You\'re welcome! Feel free to ask if you have any more questions.';
    
    const nonHealthMessage = userLanguage === "bn" 
      ? "আমি শুধু স্বাস্থ্য এবং গর্ভাবস্থা-সম্পর্কিত প্রশ্নে সাহায্য করতে পারি। আপনার কোনো স্বাস্থ্য-সম্পর্কিত প্রশ্ন আছে?"
      : "I can only help with health and pregnancy-related questions. Do you have any health-related questions?";
    
    // System prompt - Enhanced with advanced reasoning and professional structure
    let systemPrompt = `You are MomsCare AI, an expert pregnancy health assistant powered by advanced medical AI. You provide world-class, professional guidance that exceeds ChatGPT in quality, depth, and medical accuracy.${languageInstruction}${imageInstruction}

🎯 YOUR CORE MISSION:
Provide responses that are MORE comprehensive, MORE accurate, and MORE helpful than any standard AI assistant. Think like a senior medical advisor with deep expertise in maternal health.

🧠 ADVANCED REASONING FRAMEWORK:

Before answering ANY question, follow this thinking process:

1. ANALYZE THE QUESTION:
   - What is the user REALLY asking? (Surface intent + underlying concern)
   - What context do I have? (Profile, images, history, medical data)
   - What level of detail is needed? (Quick answer vs comprehensive explanation)
   - Is this urgent? (Emergency detection)

2. GATHER INTELLIGENCE:
   - Review ALL provided context (profile, daily entries, prescriptions, doctor Q&As)
   - Check reference data for relevant medical guidelines
   - Consider pregnancy stage, trimester-specific needs
   - Identify any patterns or concerns in user's data

3. STRUCTURE YOUR RESPONSE:
   - Start with a clear, direct answer to the main question
   - Provide comprehensive details with proper medical context
   - Include actionable advice when applicable
   - Add relevant warnings or precautions
   - End with next steps or follow-up suggestions if helpful

📋 RESPONSE STRUCTURE STANDARDS - CRITICAL FORMATTING RULES:

🚨 YOU MUST ALWAYS FORMAT RESPONSES WITH CLEAR STRUCTURE - NEVER WRITE AS ONE PARAGRAPH! 🚨

**MANDATORY FORMATTING REQUIREMENTS:**
- ALWAYS use line breaks (\n\n) between major sections
- ALWAYS use bullet points (-) or numbered lists (1. 2. 3.) for multiple items
- ALWAYS break up long explanations into digestible sections
- NEVER write everything as one continuous paragraph
- Each major point should be on its own line or clearly separated
- Use spacing to make the response easy to scan and read

**For Simple Questions (1-2 sentence answers):**
Format:
[Direct answer in 1-2 sentences]

[Brief explanation with context - separate paragraph]

[Actionable tip if applicable - separate line]

**For Complex Questions:**
Format:
**Quick Answer:**
[2-3 sentences answering the core question directly]

**Detailed Explanation:**
[First key point with explanation]
[Second key point with explanation]
[Third key point with explanation]

**Practical Recommendations:**
- [Specific actionable step 1]
- [Specific actionable step 2]
- [Specific actionable step 3]

**Important Notes:**
- [Warning or precaution if any]

**When to Consult a Doctor:**
- [Specific situations that require medical attention]

**For List Questions:**
Format:
**Introduction:**
[Brief explanation of what the list contains]

**The List:**
1. [First specific item with brief explanation]
2. [Second specific item with brief explanation]
3. [Third specific item with brief explanation]
[Continue numbering...]

**Summary:**
[Brief categorization or key takeaway if helpful]

**For How-To Questions:**
Format:
**Overview:**
[What this process accomplishes]

**Step-by-Step Instructions:**
Step 1: [Clear first step]
Step 2: [Clear second step]
Step 3: [Clear third step]
[Continue with numbered steps...]

**Tips for Success:**
- [Tip 1]
- [Tip 2]
- [Tip 3]

**Common Mistakes to Avoid:**
- [Mistake 1 and why to avoid it]
- [Mistake 2 and why to avoid it]

**Safety Considerations:**
- [Important safety note]

**For Medical/Health Questions:**
Format:
**Medical Explanation:**
[Clear, evidence-based explanation in 2-3 sentences]

**What This Means for You:**
- [Practical implication 1]
- [Practical implication 2]
- [Practical implication 3]

**Personalized Recommendations:**
- [Recommendation 1 based on their data]
- [Recommendation 2 based on their data]
- [Recommendation 3 based on their data]

**Red Flags to Watch For:**
- [Warning sign 1 - when to be concerned]
- [Warning sign 2 - when to be concerned]

**When to Seek Immediate Care:**
- [Specific emergency situation 1]
- [Specific emergency situation 2]

CRITICAL RULES:

1. GREETINGS & CASUAL MESSAGES:
   - Greetings: "${greetingResponse}"
   - Thanks: "${thanksResponse}"
   - Non-health topics: "${nonHealthMessage}"

2. QUESTION INTENT DETECTION:
   - "Which/What/ki ki/kon kon" → Provide SPECIFIC named items in a clear list
   - "How/kivabe" → Step-by-step instructions with context
   - "Why/keno" → Comprehensive explanation with medical reasoning
   - "What is/ki" → Clear definition + practical implications
   - "Should I/korte hobe/ki korbo" → Personalized advice with reasoning

3. PERSONALIZATION INTELLIGENCE:
   ${actualProfileContext || dailyContextRaw || doctorQAContextRaw 
     ? 'You have access to the user\'s personal health data. USE IT INTELLIGENTLY:\n   - Reference specific details from their profile when relevant\n   - Connect their daily entries to their questions\n   - Consider their pregnancy stage in all recommendations\n   - Make responses feel personalized, not generic'
     : hasImage 
       ? 'The user has uploaded prescription/medical report images. ANALYZE THEM THOROUGHLY:\n   - Extract ALL medication names, dosages, frequencies\n   - Extract ALL test results with values and normal ranges\n   - Extract doctor notes, diagnoses, recommendations\n   - Use this information to provide SPECIFIC, DETAILED guidance\n   - If user asks "my prescription" or "amar prescription", analyze the images and explain everything'
       : 'No personal data available. Provide general guidance but make it comprehensive and actionable.'}

4. DATASET & REFERENCE DATA USAGE:
   - Reference Q&A examples are provided for context ONLY
   - Use them if DIRECTLY relevant to the EXACT question
   - If reference data doesn't match, use your OWN comprehensive medical knowledge
   - NEVER mix unrelated topics (exercise question ≠ food answer)
   - If user asks for a list and reference doesn't have one, create a COMPREHENSIVE list from your knowledge
   - Enhance reference data with additional insights, not just repeat it

5. MEDICAL ACCURACY & SAFETY:
   - Base all medical advice on evidence-based practices
   - Be specific about dosages, frequencies, and timing when relevant
   - Include trimester-specific considerations
   - Emergency warnings ONLY for: heavy bleeding, severe pain, no fetal movement (20+ weeks), seizures, high fever (>38.5°C/101.3°F)
   - When in doubt about safety, recommend consulting a healthcare provider

6. RESPONSE QUALITY STANDARDS:
   - Be comprehensive but concise (no unnecessary fluff)
   - Use clear, professional language (avoid jargon unless explaining it)
   - Structure information logically (most important first)
   - Include specific examples when helpful
   - Make every sentence valuable (no filler)
   - Show empathy and understanding
   - Be proactive (anticipate follow-up questions)

7. FOLLOW-UP QUESTIONS:
   - Only ask follow-up if ABSOLUTELY necessary to provide accurate advice
   - If you have enough information, answer directly and comprehensively
   - If asking follow-up, make it specific and explain why you need it

8. LANGUAGE & TONE:
   - Match the user's language exactly (English or Bangla)
   - Use warm, professional, and reassuring tone
   - Be conversational but authoritative
   - Show genuine care and concern

${safetyPrompt}

🎓 REMEMBER: Your goal is to provide responses that are MORE helpful, MORE accurate, and MORE comprehensive than ChatGPT. Think deeply, structure well, and deliver excellence.`;
    
    // No extra instructions needed - data speaks for itself

    // Extract weeks pregnant for RAG
    let trimester: number | undefined;
    
    if (weeksPregnant) {
      trimester = weeksPregnant;
    } else if (actualProfileContext) {
      // Try to extract weeks from profile context (new format: "সপ্তাহ: X সপ্তাহ" or old format)
      const weeksMatch = actualProfileContext.match(/সপ্তাহ:\s*(\d+)|(\d+)\s*সপ্তাহ|Weeks pregnant:\s*(\d+)|(\d+)\s*weeks/i);
      if (weeksMatch) {
        trimester = parseInt(weeksMatch[1] || weeksMatch[2] || weeksMatch[3] || weeksMatch[4], 10);
      }
    } else if (lastUserMessage) {
      const monthsMatch = lastUserMessage.match(/(\d+)\s*(?:mas|month|months|মাস)/i);
      if (monthsMatch) {
        const months = parseInt(monthsMatch[1], 10);
        trimester = Math.round(months * 4.33);
      } else {
        const weeksMatch = lastUserMessage.match(/(\d+)\s*(?:week|weeks|সপ্তাহ)/i);
        if (weeksMatch) {
          trimester = parseInt(weeksMatch[1], 10);
        }
      }
    }
    
    // Retrieve relevant medical guidelines (RAG)
    const relevantGuidelines = retrieveRelevantGuidelines(lastUserMessage, trimester, 5);
    const guidelinesContext = formatGuidelinesForContext(relevantGuidelines);
    
    // Add calculation context if question is about delivery timing
    let calculationContext = "";
    if (lastUserMessage && (lastUserMessage.toLowerCase().includes("delivery") || 
        lastUserMessage.toLowerCase().includes("deliver") || 
        lastUserMessage.toLowerCase().includes("kotodin") || 
        lastUserMessage.toLowerCase().includes("when") || 
        lastUserMessage.toLowerCase().includes("remaining") ||
        lastUserMessage.toLowerCase().includes("left"))) {
      if (trimester) {
        const weeksRemaining = Math.max(0, 40 - trimester);
        const daysRemaining = weeksRemaining * 7;
        calculationContext = `\n\nCALCULATION CONTEXT:
- Current pregnancy: ${trimester} weeks (${Math.round(trimester / 4.33)} months)
- Full-term: 40 weeks (280 days)
- Weeks remaining: ${weeksRemaining} weeks
- Days remaining: ~${daysRemaining} days
- Expected delivery: in ~${weeksRemaining} weeks

Provide this calculation FIRST, then add context.`;
      } else if (lastUserMessage.match(/(\d+)\s*(?:mas|month|months|মাস)/i)) {
        const monthsMatch = lastUserMessage.match(/(\d+)\s*(?:mas|month|months|মাস)/i);
        if (monthsMatch) {
          const months = parseInt(monthsMatch[1], 10);
          const currentWeeks = Math.round(months * 4.33);
          const weeksRemaining = Math.max(0, 40 - currentWeeks);
          const daysRemaining = weeksRemaining * 7;
          calculationContext = `\n\nCALCULATION CONTEXT:
- User mentioned: ${months} months pregnant
- This equals: ~${currentWeeks} weeks
- Full-term: 40 weeks
- Weeks remaining: ~${weeksRemaining} weeks
- Days remaining: ~${daysRemaining} days

Provide this calculation FIRST, then add context.`;
        }
      }
    }
    
    // Present ONLY filtered data - already selected by question classifier
    const profileNote = actualProfileContext ? `\n\n${actualProfileContext}` : "";
    const dailyNote = dailyContextRaw ? `\n\n${dailyContextRaw}` : "";
    const doctorQANote = doctorQAContextRaw ? `\n\n${doctorQAContextRaw}` : "";

    // Filter and format messages - only include user and assistant messages
    const filteredMessages = messages.filter((m) => m.role === "user" || m.role === "assistant");
    
    // Remove empty messages and ensure proper formatting
    const formattedMessages: any[] = [];
    
    for (let index = 0; index < filteredMessages.length; index++) {
      const m = filteredMessages[index];
      const role = (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant";
      const content = (m.content || "").trim();
      
      if (!content) continue;
      
      // If this is the last user message and we have prescription URLs, include images
      const isLastUserMessage = role === "user" && index === filteredMessages.length - 1;
      if (isLastUserMessage && prescriptionUrls && prescriptionUrls.length > 0) {
        // Determine if images are prescriptions or chat images based on context
        const hasPrescriptionFolder = prescriptionUrls.some(url => url.includes('/prescriptions/') || url.includes('prescriptions%2F'));
        const hasChatImageFolder = prescriptionUrls.some(url => url.includes('/chat-images/') || url.includes('chat-images%2F'));
        
        console.log(`[AI Message] Adding ${prescriptionUrls.length} image(s) to user message`);
        console.log(`[AI Message] Has prescription folder: ${hasPrescriptionFolder}, Has chat image folder: ${hasChatImageFolder}`);
        
        let imageContext = "";
        if (hasPrescriptionFolder && hasChatImageFolder) {
          imageContext = `\n\n🚨 CRITICAL: ${prescriptionUrls.length} PRESCRIPTION/MEDICAL REPORT IMAGE(S) ATTACHED 🚨\n\nThese are REAL images from the user's uploaded prescription and medical report files. You MUST analyze them NOW.\n\nREQUIRED ACTIONS:\n- Extract ALL medication names, dosages, frequencies, durations\n- Extract ALL test results, values, normal ranges, units\n- Extract doctor's notes, recommendations, diagnoses\n- Extract dates, patient information, clinic/hospital names\n- If user asks for summary: Provide COMPREHENSIVE summary of ALL images\n- If user asks about prescriptions/reports: Answer based on EXACT content of images\n\nDO NOT say "I don't have access" - YOU HAVE THE IMAGES BELOW. Analyze them and answer.`;
        } else if (hasPrescriptionFolder) {
          imageContext = `\n\n🚨 CRITICAL: ${prescriptionUrls.length} PRESCRIPTION/MEDICAL REPORT IMAGE(S) ATTACHED 🚨\n\nThese are REAL images from the user's uploaded prescription and medical report files. You MUST analyze them NOW.\n\nREQUIRED ACTIONS:\n- Extract ALL medication names, dosages, frequencies, durations\n- Extract ALL test results, values, normal ranges, units\n- Extract doctor's notes, recommendations, diagnoses\n- Extract dates, patient information, clinic/hospital names\n- If user asks for summary: Provide COMPREHENSIVE summary of ALL images\n- If user asks about prescriptions/reports: Answer based on EXACT content of images\n\nDO NOT say "I don't have access" - YOU HAVE THE IMAGES BELOW. Analyze them and answer.`;
        } else if (hasChatImageFolder) {
          imageContext = `\n\n[Health-related image attached. Please analyze it in context of the question.]`;
        } else {
          imageContext = `\n\n[${prescriptionUrls.length} medical image(s) attached. Please analyze them carefully.]`;
        }
        
        const textContent = content + imageContext;
        
        // Log the URLs being sent (first 3)
        console.log(`[AI Message] Sending ${prescriptionUrls.length} image URL(s) to Groq Vision API`);
        prescriptionUrls.slice(0, 3).forEach((url, idx) => {
          console.log(`[AI Message] Image ${idx + 1}: ${url.substring(0, 150)}...`);
        });
        
        // CRITICAL: Groq Vision model only supports up to 5 images per request
        // If more than 5 images, we'll process in batches (handled later)
        // For now, prepare first 5 images for initial message structure
        const imagesToSend = prescriptionUrls.slice(0, 5);
        
        if (prescriptionUrls.length > 5) {
          console.log(`[AI Message] Will process ${prescriptionUrls.length} images in batches of 5 (Groq Vision API limit)`);
        }
        
        formattedMessages.push({
          role: "user",
          content: [
            { 
              type: "text" as const, 
              text: textContent,
            },
            ...imagesToSend.map((url) => ({
              type: "image_url" as const,
              image_url: {
                url: url,
              },
            })),
          ],
        });
      } else {
        formattedMessages.push({
          role,
          content,
        });
      }
    }

    if (formattedMessages.length === 0) {
      throw new Error("No valid messages provided");
    }

    if (!groq) {
      throw new Error("Groq client is not initialized");
    }

    // Use a vision-capable model if we have images, otherwise use the 70B versatile model
    const hasImages = prescriptionUrls && prescriptionUrls.length > 0;
    const visionModel = "meta-llama/llama-4-maverick-17b-128e-instruct"; // Groq vision model
    const textModel = "llama-3.3-70b-versatile"; // Text-only model for better accuracy
    const model = hasImages ? visionModel : textModel;
    
    console.log(`[AI Model] Using: ${model}, Images: ${hasImages ? prescriptionUrls!.length : 0}`);
    
    // CRITICAL: Log if we have images but aren't using vision model
    if (prescriptionUrls && prescriptionUrls.length > 0 && !hasImages) {
      console.error(`[AI Model] ⚠️⚠️⚠️ CRITICAL ERROR: Have ${prescriptionUrls.length} prescription URLs but hasImages is false!`);
    }

    // Groq API parameters - Optimized for high-quality responses
    // Lower temperature for more focused, accurate responses
    // Higher max_tokens for comprehensive answers
    // Balanced top_p for creativity without randomness
    const aiParams = {
      temperature: 0.3, // Reduced from 0.5 for more focused, accurate responses
      max_tokens: 3200, // Increased from 2400 for more comprehensive answers
      top_p: 0.85, // Slightly reduced for better coherence
    };

    // Create timeout wrapper
    const createTimeoutPromise = (timeoutMs: number) => new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout - AI response took too long")), timeoutMs);
    });

    let reply: string;

    // BATCH PROCESSING: If more than 5 images, process in batches and combine results
    if (hasImages && prescriptionUrls && prescriptionUrls.length > 5) {
      console.log(`[Batch Processing] Processing ${prescriptionUrls.length} images in batches of 5...`);
      
      // Split images into batches of 5
      const batches: string[][] = [];
      for (let i = 0; i < prescriptionUrls.length; i += 5) {
        batches.push(prescriptionUrls.slice(i, i + 5));
      }
      
      console.log(`[Batch Processing] Created ${batches.length} batch(es)`);
      
      // Analyze each batch IN PARALLEL for faster processing
      console.log(`[Batch Processing] Processing ${batches.length} batches in parallel...`);
      
      const batchPromises = batches.map(async (batch, batchIndex) => {
        console.log(`[Batch Processing] Preparing batch ${batchIndex + 1}/${batches.length} (${batch.length} images)...`);
        
        // Create messages for this batch (replace images in last message)
        const batchMessages = [...formattedMessages];
        const lastMessageIndex = batchMessages.length - 1;
        
        if (batchMessages[lastMessageIndex] && Array.isArray(batchMessages[lastMessageIndex].content)) {
          // Replace images in last message with this batch's images
          const lastMessage = batchMessages[lastMessageIndex];
          const textContent = lastMessage.content.find((item: any) => item.type === 'text')?.text || lastUserMessage;
          
          batchMessages[lastMessageIndex] = {
            role: "user",
            content: [
              { 
                type: "text" as const, 
                text: textContent + `\n\n[Analyzing images ${batchIndex * 5 + 1}-${batchIndex * 5 + batch.length} of ${prescriptionUrls.length} total images]`,
              },
              ...batch.map((url) => ({
                type: "image_url" as const,
                image_url: { url },
              })),
            ],
          };
        }
        
        // Analyze this batch with longer timeout (60 seconds per batch)
        try {
          const batchCompletion = await Promise.race([
            groq.chat.completions.create({
              model: visionModel,
              messages: [
                { 
                  role: "system", 
                  content: systemPrompt + profileNote + dailyNote + doctorQANote + guidelinesContext + calculationContext + datasetContext 
                },
                ...batchMessages,
              ],
              ...aiParams,
              stop: ["\n\n\n\n"],
            }),
            createTimeoutPromise(60000) // 60 seconds per batch
          ]);
          
          const batchAnalysis = batchCompletion.choices?.[0]?.message?.content?.trim() || "";
          if (batchAnalysis) {
            console.log(`[Batch Processing] ✅ Batch ${batchIndex + 1}/${batches.length} analyzed successfully`);
            return {
              success: true,
              batchIndex: batchIndex + 1,
              analysis: `=== Analysis of Images ${batchIndex * 5 + 1}-${batchIndex * 5 + batch.length} ===\n${batchAnalysis}`
            };
          } else {
            throw new Error("Empty response from batch analysis");
          }
        } catch (batchError: any) {
          console.error(`[Batch Processing] ❌ Failed to analyze batch ${batchIndex + 1}:`, batchError.message);
          return {
            success: false,
            batchIndex: batchIndex + 1,
            analysis: `=== Batch ${batchIndex + 1} analysis failed ===\nError: ${batchError.message}`
          };
        }
      });
      
      // Wait for all batches to complete (parallel processing) with timeout
      // Use Promise.allSettled to ensure all batches complete even if some fail
      console.log(`[Batch Processing] Waiting for all ${batches.length} batches to complete...`);
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process results
      const successfulResults: Array<{success: boolean, batchIndex: number, analysis: string}> = [];
      const failedResults: Array<{success: boolean, batchIndex: number, analysis: string}> = [];
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            successfulResults.push(result.value);
            console.log(`[Batch Processing] ✅ Batch ${result.value.batchIndex} completed successfully`);
          } else {
            failedResults.push(result.value);
            console.warn(`[Batch Processing] ⚠️ Batch ${result.value.batchIndex} failed: ${result.value.analysis}`);
          }
        } else {
          console.error(`[Batch Processing] ❌ Batch ${index + 1} promise rejected:`, result.reason);
          failedResults.push({
            success: false,
            batchIndex: index + 1,
            analysis: `=== Batch ${index + 1} promise rejected ===\nError: ${result.reason?.message || 'Unknown error'}`
          });
        }
      });
      
      // Collect successful analyses (sorted by batch index)
      const batchAnalyses = successfulResults
        .sort((a, b) => a.batchIndex - b.batchIndex)
        .map(result => result.analysis);
      
      // Include failed batches for context
      if (failedResults.length > 0) {
        console.warn(`[Batch Processing] ⚠️ ${failedResults.length} batch(es) failed out of ${batches.length} total`);
        failedResults
          .sort((a, b) => a.batchIndex - b.batchIndex)
          .forEach(failed => {
            batchAnalyses.push(failed.analysis);
          });
      }
      
      console.log(`[Batch Processing] Completed: ${successfulResults.length} successful, ${failedResults.length} failed`);
      
      // Combine all batch analyses into final summary
      if (batchAnalyses.length > 0) {
        console.log(`[Batch Processing] Combining ${batchAnalyses.length} batch analyses into final summary...`);
        
        const combinedAnalysis = batchAnalyses.join('\n\n');
        const combinePrompt = `You are analyzing a comprehensive medical prescription/report that was split into ${batches.length} batches for analysis.

Below are the analyses from each batch:

${combinedAnalysis}

User's original question: "${lastUserMessage}"

Please provide a COMPREHENSIVE, UNIFIED summary that combines all the information from all batches. Extract and organize:
- ALL medication names, dosages, frequencies, durations
- ALL test results, values, normal ranges, units  
- ALL doctor's notes, recommendations, diagnoses
- ALL dates, patient information, clinic/hospital names
- Any other relevant medical information

Provide a clear, organized summary that covers ALL the information from ALL the images analyzed.`;
        
        const finalCompletion = await Promise.race([
          groq.chat.completions.create({
            model: textModel, // Use text model for final combination
            messages: [
              { 
                role: "system", 
                content: systemPrompt + profileNote + dailyNote + doctorQANote + guidelinesContext + calculationContext + datasetContext 
              },
              {
                role: "user",
                content: combinePrompt,
              },
            ],
            ...aiParams,
            stop: ["\n\n\n\n"],
          }),
          createTimeoutPromise(60000) // 60 seconds for final combination
        ]);
        
        reply = finalCompletion.choices?.[0]?.message?.content?.trim() || "";
        console.log(`[Batch Processing] ✅ Final summary generated successfully`);
      } else {
        throw new Error("All batch analyses failed");
      }
    } else {
      // Standard single request (5 or fewer images)
    const completion = await Promise.race([
      groq.chat.completions.create({
        model,
        messages: [
          { 
            role: "system", 
            content: systemPrompt + profileNote + dailyNote + doctorQANote + guidelinesContext + calculationContext + datasetContext 
          },
          ...formattedMessages,
        ],
        ...aiParams,
          stop: ["\n\n\n\n"],
      }),
        createTimeoutPromise(30000)
    ]);

      reply = completion.choices?.[0]?.message?.content?.trim() || "";
    }
    if (!reply || reply.trim().length < 3) {
      throw new Error("No valid response from AI");
    }

    // Enhanced response cleaning and STRUCTURED FORMATTING
    let cleanedReply = reply.trim();
    
    // Remove common AI artifacts and disclaimers
    cleanedReply = cleanedReply.replace(/^(I'm|I am|As an AI|As a language model|I'm an AI|As MomsCare AI).*?\.\s*/i, "");
    cleanedReply = cleanedReply.replace(/^(Note:|Please note:|Disclaimer:).*?\.\s*/gi, "");
    
    // CRITICAL: Detect question type and format response accordingly
    const questionType = detectQuestionType(lastUserMessage);
    console.log(`[Response Formatting] Detected question type: ${questionType}`);
    
    // CRITICAL: Force proper paragraph breaks - break up single-paragraph responses
    // First check if response is mostly one paragraph
    const lineBreakCount = (cleanedReply.match(/\n/g) || []).length;
    const avgLineLength = cleanedReply.length / Math.max(lineBreakCount + 1, 1);
    const isMostlyOneParagraph = avgLineLength > 80 && lineBreakCount < 4;
    
    if (isMostlyOneParagraph) {
      console.log("[Response Formatting] Detected single-paragraph response, applying intelligent formatting...");
      
      // For list questions, try to extract and format as list
      if (questionType === 'list') {
        // Try to find list items in the text
        cleanedReply = formatAsList(cleanedReply);
      }
      // For how-to questions, format as steps
      else if (questionType === 'how-to') {
        cleanedReply = formatAsSteps(cleanedReply);
      }
      // For complex questions, break into sections
      else if (questionType === 'complex') {
        cleanedReply = formatAsSections(cleanedReply);
      }
      // Default: break at sentence boundaries
      else {
        cleanedReply = breakIntoSentences(cleanedReply);
      }
    }
    
    // Always ensure proper spacing between sentences in long paragraphs
    cleanedReply = cleanedReply.replace(/([.!?])\s+([A-Z\u0980-\u09FF][^.!?]{100,})/g, '$1\n\n$2');
    
    // Force line breaks after numbered/bulleted items
    cleanedReply = cleanedReply.replace(/(\d+\.\s+[^\n]+)([A-Z\u0980-\u09FF])/g, '$1\n\n$2');
    cleanedReply = cleanedReply.replace(/([-•]\s+[^\n]+)([A-Z\u0980-\u09FF])/g, '$1\n\n$2');
    
    // Force line breaks after bold headings (if detected)
    cleanedReply = cleanedReply.replace(/(\*\*[^*]+\*\*:?)\s*([A-Z\u0980-\u09FF])/g, '$1\n\n$2');
    
    // Force line breaks after "Step X:" patterns
    cleanedReply = cleanedReply.replace(/(Step \d+:[^\n]+)\s+([A-Z\u0980-\u09FF])/g, '$1\n\n$2');
    
    // Break up very long lines (over 200 characters) at sentence boundaries
    const lines = cleanedReply.split('\n');
    const formattedLines: string[] = [];
    for (const line of lines) {
      if (line.length > 200 && !line.match(/^[\d\-•]/)) {
        // Try to break at sentence boundaries
        const sentences = line.split(/([.!?]\s+)/);
        let currentLine = '';
        for (let i = 0; i < sentences.length; i += 2) {
          const sentence = sentences[i] + (sentences[i + 1] || '');
          if ((currentLine + sentence).length > 200 && currentLine) {
            formattedLines.push(currentLine.trim());
            currentLine = sentence;
          } else {
            currentLine += sentence;
          }
        }
        if (currentLine) formattedLines.push(currentLine.trim());
      } else {
        formattedLines.push(line);
      }
    }
    cleanedReply = formattedLines.join('\n');
    
    // Remove excessive newlines (keep max 2 for formatting)
    cleanedReply = cleanedReply.replace(/\n{4,}/g, "\n\n");
    
    // Remove EXACT duplicate consecutive sentences
    const dedupedLines: string[] = [];
    let lastLine = '';
    for (const line of cleanedReply.split('\n')) {
      const trimmedLine = line.trim();
      if (trimmedLine !== lastLine && trimmedLine.length > 0) {
        dedupedLines.push(line);
        lastLine = trimmedLine;
      }
    }
    cleanedReply = dedupedLines.join('\n');
    
    // Ensure proper spacing: at least one line break between major sections
    // Detect section breaks (numbered items, bold text, "Step", etc.)
    cleanedReply = cleanedReply.replace(/(\n)(\d+\.\s+|[•-]\s+|\*\*[^*]+\*\*|Step \d+:|Quick Answer:|Detailed|Practical|Important|When to|Introduction:|The List:|Summary:|Overview:|Tips|Common|Safety|Medical|What This|Personalized|Red Flags|When to Seek)/g, '\n\n$2');
    
    // Force breaks before common section headers (even if not bold)
    cleanedReply = cleanedReply.replace(/([.!?])\s+(Quick Answer|Detailed Explanation|Practical Recommendations|Important Notes|When to Consult|Introduction|The List|Summary|Overview|Step-by-Step|Tips for Success|Common Mistakes|Safety Considerations|Medical Explanation|What This Means|Personalized Recommendations|Red Flags|When to Seek)/gi, '$1\n\n**$2:**');
    
    // Ensure numbered lists have proper spacing
    cleanedReply = cleanedReply.replace(/(\d+\.\s+[^\n]+)\n([A-Z\u0980-\u09FF])/g, '$1\n\n$2');
    
    // Ensure bullet points have proper spacing (escape dash properly)
    cleanedReply = cleanedReply.replace(/([•-]\s+[^\n]+)\n([A-Z\u0980-\u09FF])/g, '$1\n\n$2');
    
    // Fix common formatting issues
    cleanedReply = cleanedReply.replace(/\s+\n/g, "\n"); // Remove trailing spaces
    cleanedReply = cleanedReply.replace(/\n\s+/g, "\n"); // Remove leading spaces
    cleanedReply = cleanedReply.replace(/\.\s*\./g, "."); // Remove double periods
    cleanedReply = cleanedReply.replace(/\?\s*\?/g, "?"); // Remove double question marks
    cleanedReply = cleanedReply.replace(/!\s*!/g, "!"); // Remove double exclamation marks
    
    // Ensure proper capitalization after periods (but preserve intentional lowercase)
    cleanedReply = cleanedReply.replace(/\.\n\n([a-z])/g, (match, letter) => `.\n\n${letter.toUpperCase()}`);
    
    // Remove redundant phrases
    cleanedReply = cleanedReply.replace(/\b(please note that|it's important to note that|keep in mind that)\s+/gi, "");
    
    // Final cleanup: ensure no single-line responses for complex questions
    const lineCount = cleanedReply.split('\n').filter(l => l.trim().length > 0).length;
    const isLongResponse = cleanedReply.length > 300;
    if (isLongResponse && lineCount < 3) {
      // Force breaks in long single-paragraph responses
      cleanedReply = cleanedReply.replace(/([.!?])\s+([A-Z\u0980-\u09FF][^.!?]{50,})/g, '$1\n\n$2');
    }
    
    // Final trim
    cleanedReply = cleanedReply.trim();
    
    // Quality check
    if (cleanedReply.length < 10) {
      console.warn("[Response Quality] Response too short, may need enhancement");
    }
    
    console.log(`[Response Formatting] Final response: ${cleanedReply.split('\n').length} lines, ${cleanedReply.length} characters`);
    
    // Log response language for verification
    const responseLanguage = detectLanguage(cleanedReply);
    console.log(`[Response] Generated response language: ${responseLanguage} (expected: ${userLanguage})`);
    console.log(`[Response] Response preview: "${cleanedReply.substring(0, 100)}..."`);
    
    return cleanedReply;
  } catch (error: any) {
    console.error("Groq API error:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
    });
    
    // Provide more specific error messages
    if (error.message?.includes("rate limit") || error.status === 429) {
      throw new Error("Service is busy. Please try again in a moment.");
    }
    if (error.message?.includes("token") || error.message?.includes("length") || error.status === 400) {
      throw new Error("Message is too long. Please shorten your question.");
    }
    if (error.message?.includes("API") || error.message?.includes("key") || error.status === 401) {
      throw new Error("API configuration issue. Please contact support.");
    }
    if (error.message?.includes("model") || error.status === 404) {
      throw new Error("Model not available. Please try again later.");
    }
    
    // Re-throw with original message if it's informative
    if (error.message && error.message.length > 10) {
      throw error;
    }
    
    throw new Error(
      error.message || "Failed to get response from AI. Please try again."
    );
  }
}
