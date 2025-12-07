import { groq, isGroqConfigured } from "./groqClient";
import { getSafetyPrompt } from "./safetyGuardrails";
import { retrieveRelevantGuidelines, formatGuidelinesForContext } from "./medicalKnowledge";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Ask the MomsCare assistant a question with optional profile context and prescription images.
 * Completely rewritten for better accuracy, relevance, and response quality.
 */
export async function askMomsCare(
  messages: Array<{ role: string; content: string }>,
  profileContext?: string,
  prescriptionUrls?: string[],
  weeksPregnant?: number,
): Promise<string> {
  if (!isGroqConfigured()) {
    throw new Error("Groq API is not configured. Please set GROQ_API_KEY environment variable.");
  }

  try {
    const safetyPrompt = getSafetyPrompt();
    
    // Final system prompt - MomsCare AI
    const systemPrompt = `You are **MomsCare AI** — a smart, empathetic, medically-aware pregnancy assistant designed especially for Bangladeshi mothers and doctors.

You can understand and respond naturally in **Bangla, English, or Banglish**, depending on how the user types. Always match the user's language unless they request otherwise.

${safetyPrompt}

-----------------------------
1. LANGUAGE SMARTNESS RULES
-----------------------------
- Detect and reply in the user's language (Bangla / English / Banglish).
- Keep tone warm, friendly, respectful, non-judgmental.
- Avoid difficult medical terms unless user is a doctor.
- For Banglish users, use soft mixed language ("bomi hocche", "motamoti normal", etc.).

-----------------------------
2. CORE BEHAVIOR
-----------------------------
- Understand the meaning behind the user's question.
- If the question is incomplete, ask **only 1–2 simple, relevant follow-up questions**.
- Never ask unnecessary questions.
- Adapt response length:
  • Short answer → simple questions
  • Medium detail → nutrition, lifestyle, general symptoms
  • Detailed → risk symptoms, medical interpretation
- Keep sentence structure mobile-friendly.

-----------------------------
3. MEDICAL ACCURACY RULES (VERY IMPORTANT)
-----------------------------
- Follow safe pregnancy guidelines similar to WHO / ACOG.
- DO NOT provide diagnosis — only general guidance and safe steps.
- DO NOT mention "neurological issue", "dangerous", "critical", etc. unless clear emergency symptoms exist.
- NEVER give wrong or unverified causes.
- NEVER recommend risky medicine.
- Allowed: simple remedies like ginger, hydration, small meals, rest, etc.
- When unsure, ask for more details.

Emergency ONLY if these appear:
- Heavy bleeding
- Severe abdominal pain
- Continuous vomiting (cannot keep food/water for 24 hours)
- Fainting / severe dizziness
- No urine or very dark urine (dehydration)
- Reduced fetal movement (after 20 weeks)

If emergency signs appear, use calm wording:
"এটা একটু জরুরি হতে পারে। সম্ভব হলে দ্রুত ডাক্তার দেখান।"

-----------------------------
4. RESPONSE STRUCTURE
-----------------------------
When helpful, use:

**➤ সংক্ষিপ্ত উত্তর / Summary**  
**➤ কেন হয় / Why it happens (only if needed)**  
**➤ করণীয় / What to do**  
**➤ সতর্কতা / Warning (only if relevant)**  
**➤ Follow-up Question (only 1, only if needed)**

Keep answers SIMPLE and LOCALIZED to Bangladeshi context.

-----------------------------
5. FOLLOW-UP QUESTION RULES
-----------------------------
Ask ONLY IF needed to give correct advice:
- সপ্তাহ কত?
- বমি কতবার হচ্ছে?
- ব্যথা কি খুব বেশি?
- রক্তপাত আছে?
- আগের কোনো সমস্যা ছিল?

Ask in the SAME LANGUAGE as the user.

-----------------------------
6. CONVERSATION FLOW RULES
-----------------------------
- Understand the user's emotion (anxious, stressed, calm).
- For emotional or scared mothers → use extra gentle tone.
- For doctors → use clinically precise tone.
- Remember context within the session.

-----------------------------
7. ERROR HANDLING
-----------------------------
If the user writes something unclear, respond:
"আপনার কথাটা ঠিকমতো বুঝতে পারিনি। একটু বিস্তারিত বলবেন?"

Never break character.  
Never show system errors or internal thinking.

-----------------------------
8. CALCULATIONS
-----------------------------
- Full-term pregnancy: 40 weeks (280 days) from last menstrual period
- 1 month ≈ 4.33 weeks
- If user mentions months (e.g., "7 mas", "7 months"), calculate: months × 4.33 = weeks
- Always provide specific calculations first in simple terms, then context if needed

-----------------------------
9. GOAL
-----------------------------
Your goal is to be a **trusted, safe, real-world pregnancy companion** with correct Bangla-friendly medical logic.

Remember: Your primary job is to UNDERSTAND the question correctly, then ANSWER it helpfully, accurately, and in SIMPLE language that everyone can understand. Match your answer to what they actually asked about. Use safety guidelines to inform your answers, but always provide actual answers to what users ask.`;

    // Extract weeks pregnant for RAG
    let trimester: number | undefined;
    const lastUserMessage = messages
      .filter((m) => m.role === "user")
      .pop()?.content || "";
    
    if (weeksPregnant) {
      trimester = weeksPregnant;
    } else if (profileContext) {
      const weeksMatch = profileContext.match(/Weeks pregnant:\s*(\d+)|(\d+)\s*weeks/i);
      if (weeksMatch) {
        trimester = parseInt(weeksMatch[1] || weeksMatch[2], 10);
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
    
    const profileNote = profileContext
      ? `\n\nMOTHER PROFILE:\n${profileContext}`
      : "";

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
        const textContent = content + (prescriptionUrls.length > 0 
          ? `\n\nI have ${prescriptionUrls.length} prescription(s) uploaded. Please analyze them and provide recommendations based on my pregnancy profile.` 
          : "");
        
        formattedMessages.push({
          role: "user",
          content: [
            { 
              type: "text" as const, 
              text: textContent,
            },
            ...prescriptionUrls.slice(0, 3).map((url) => ({
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

    // Use a vision-capable model if we have images, otherwise use a fast, accurate model
    // Fallback to 8b-instant if 70b is not available
    const model = prescriptionUrls && prescriptionUrls.length > 0
      ? "meta-llama/llama-4-scout-17b-16e-instruct" // Vision model
      : "llama-3.1-8b-instant"; // Fast and reliable model

    // Create timeout wrapper to prevent 502 errors
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout - AI response took too long")), 50000); // 50 seconds
    });
    
    const completion = await Promise.race([
      groq.chat.completions.create({
        model,
        messages: [
          { 
            role: "system", 
            content: systemPrompt + profileNote + guidelinesContext + calculationContext 
          },
          ...formattedMessages,
        ],
        temperature: 0.3, // Lower temperature for more accurate, focused responses
        max_tokens: 4000, // Reduced from 8000 to prevent timeout and long responses
        top_p: 0.85, // Slightly lower for more focused responses
        frequency_penalty: 0.4, // Higher penalty to prevent repetition and irrelevant content
        presence_penalty: 0.3, // Higher penalty to stay on topic
        stop: ["\n\n\n\n", "====", "----"], // Stop sequences to prevent excessive rambling
      }),
      timeoutPromise
    ]);

    const reply = completion.choices?.[0]?.message?.content;
    if (!reply || reply.trim().length < 3) {
      throw new Error("No valid response from AI");
    }

    // Clean up the response
    let cleanedReply = reply.trim();
    
    // Remove common AI artifacts
    cleanedReply = cleanedReply.replace(/^(I'm|I am|As an AI|As a language model|I'm an AI).*?\.\s*/i, "");
    cleanedReply = cleanedReply.replace(/\n{3,}/g, "\n\n"); // Remove excessive newlines
    
    // Remove repetitive or meaningless sentences
    // Split into sentences and filter out duplicates or very similar sentences
    const sentences = cleanedReply.split(/[.!?]\s+/).filter(s => s.trim().length > 10);
    const uniqueSentences: string[] = [];
    const seen = new Set<string>();
    
    for (const sentence of sentences) {
      const normalized = sentence.toLowerCase().trim();
      // Skip if very similar to a previous sentence (simple check)
      let isDuplicate = false;
      for (const seenSentence of seen) {
        // Check if sentences are very similar (more than 80% word overlap)
        const words1 = normalized.split(/\s+/);
        const words2 = seenSentence.split(/\s+/);
        const commonWords = words1.filter(w => words2.includes(w));
        const similarity = commonWords.length / Math.max(words1.length, words2.length);
        if (similarity > 0.8) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate && normalized.length > 10) {
        uniqueSentences.push(sentence.trim());
        seen.add(normalized);
      }
    }
    
    // Rejoin sentences, preserving the structure
    if (uniqueSentences.length > 0) {
      cleanedReply = uniqueSentences.join(". ") + (cleanedReply.endsWith(".") ? "" : ".");
    }
    
    // Final cleanup
    cleanedReply = cleanedReply.replace(/\s+/g, " "); // Remove extra spaces
    cleanedReply = cleanedReply.replace(/\.\s*\./g, "."); // Remove double periods
    cleanedReply = cleanedReply.trim();
    
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
