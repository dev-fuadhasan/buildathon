import { NextRequest, NextResponse } from "next/server";
import { askMomsCare } from "@/lib/momsCareChat";
import { getUserFromRequest } from "@/lib/auth";
import { getMother } from "@/lib/data";
import { listObjects, signedUrl } from "@/lib/r2Client";
import { checkSafety } from "@/lib/safetyGuardrails";
import { detectLanguage, translateToEnglish, translateToBangla } from "@/lib/translation";

// Increase timeout for chat API (60 seconds)
export const maxDuration = 60;

// Helper to clean and deduplicate messages
function cleanMessages(messages: Array<{ role: string; content: string }>): Array<{ role: string; content: string }> {
  const cleaned: Array<{ role: string; content: string }> = [];
  let lastContent = "";
  
  for (const msg of messages) {
    const content = (msg.content || "").trim();
    
    // Skip empty messages
    if (!content) continue;
    
    // Skip duplicate consecutive messages (same role and content)
    if (content === lastContent && msg.role === cleaned[cleaned.length - 1]?.role) {
      continue;
    }
    
    // Skip if this assistant message is identical to the previous one
    if (msg.role === "assistant" && cleaned.length > 0 && cleaned[cleaned.length - 1].role === "assistant") {
      if (content === cleaned[cleaned.length - 1].content) {
        continue;
      }
    }
    
    cleaned.push({ role: msg.role, content });
    lastContent = content;
  }
  
  return cleaned;
}

// Helper to limit conversation history to prevent token overflow
function limitConversationHistory(
  messages: Array<{ role: string; content: string }>,
  maxMessages: number = 20
): Array<{ role: string; content: string }> {
  // Always keep the first message if it's a system/assistant greeting
  // Keep the last maxMessages messages
  if (messages.length <= maxMessages) {
    return messages;
  }
  
  // Keep first message if it's an assistant greeting
  const firstMessage = messages[0];
  const isGreeting = firstMessage?.role === "assistant" && 
    (firstMessage.content.includes("Hi") || firstMessage.content.includes("হাই") || 
     firstMessage.content.includes("MomsCare") || firstMessage.content.includes("assistant"));
  
  if (isGreeting) {
    return [firstMessage, ...messages.slice(-(maxMessages - 1))];
  }
  
  return messages.slice(-maxMessages);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let messages = body.messages || [];
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Clean and deduplicate messages
    messages = cleanMessages(messages);
    
    // Limit conversation history to prevent token overflow and maintain focus
    messages = limitConversationHistory(messages, 18);

    const user = await getUserFromRequest(req);

    let profileContext: string | undefined = body.profileContext;
    let prescriptionUrls: string[] = [];
    let weeksPregnant: number | undefined;
    
    if (user?.role === "mother") {
      try {
        const mother = await getMother(user.id);
        if (mother) {
          const daysPregnant = mother.daysPregnant || (mother.weeksPregnant ? mother.weeksPregnant * 7 : undefined);
          const weeks = daysPregnant ? Math.floor(daysPregnant / 7) : mother.weeksPregnant;
          const months = weeks ? Math.round(weeks / 4.33) : undefined;
          
          // Build comprehensive profile context for personalized AI
          const profileParts: string[] = [];
          
          if (mother.name) profileParts.push(`নাম: ${mother.name}`);
          if (mother.age) profileParts.push(`বয়স: ${mother.age}`);
          if (weeks) profileParts.push(`গর্ভাবস্থার সপ্তাহ: ${weeks} সপ্তাহ (${months || Math.round(weeks / 4.33)} মাস)`);
          if (mother.dueDate) profileParts.push(`প্রত্যাশিত তারিখ: ${mother.dueDate}`);
          if (mother.bloodGroup) profileParts.push(`রক্তের গ্রুপ: ${mother.bloodGroup}`);
          if (mother.previousPregnancies !== undefined) profileParts.push(`আগের গর্ভাবস্থা: ${mother.previousPregnancies}`);
          if (mother.conditions) profileParts.push(`চিকিৎসা অবস্থা/জটিলতা: ${mother.conditions}`);
          if (mother.allergies) profileParts.push(`অ্যালার্জি: ${mother.allergies}`);
          if (mother.medications) profileParts.push(`বর্তমান ওষুধ: ${mother.medications}`);
          if (mother.emergencyContact) profileParts.push(`জরুরি যোগাযোগ: ${mother.emergencyContact} (${mother.emergencyPhone || "N/A"})`);
          
          profileContext = profileParts.length > 0 
            ? `MOTHER PROFILE DATA:\n${profileParts.join("\n")}`
            : undefined;
          weeksPregnant = weeks;
          
          try {
            const prefix = `prescriptions/${user.id}/`;
            const objects = await listObjects(prefix);
            prescriptionUrls = await Promise.all(
              (objects || []).slice(0, 5).map(async (obj) => await signedUrl(obj.Key!))
            );
          } catch (err) {
            console.error("Failed to fetch prescriptions:", err);
          }
        }
      } catch (err) {
        console.error("Failed to fetch mother profile:", err);
      }
    }

    // Get the last user message
    const lastUserMessage = messages
      .filter((m: any) => m.role === "user")
      .pop()?.content || "";
    
    if (!lastUserMessage.trim()) {
      return NextResponse.json(
        { error: "User message is required" },
        { status: 400 }
      );
    }
    
    // Detect language of user message
    const userLanguage = detectLanguage(lastUserMessage);
    
    // Estimate token count more accurately
    const allMessagesText = JSON.stringify(messages) + (profileContext || "");
    const estimatedTokens = Math.ceil(allMessagesText.length / 3.5); // More accurate estimate
    
    // Check if token limit is exceeded (8000 tokens max, leave buffer for response)
    if (estimatedTokens > 6000) {
      // Trim more aggressively
      messages = limitConversationHistory(messages, 12);
      
      // Re-check
      const newEstimatedTokens = Math.ceil((JSON.stringify(messages) + (profileContext || "")).length / 3.5);
      if (newEstimatedTokens > 6000) {
        const errorMessage = userLanguage === "bn"
          ? "আপনার কথোপকথন খুব দীর্ঘ হয়ে গেছে। অনুগ্রহ করে একটি নতুন প্রশ্ন করুন বা পৃষ্ঠাটি রিফ্রেশ করুন।"
          : "Your conversation has become too long. Please ask a new question or refresh the page.";
        
        return NextResponse.json({
          reply: errorMessage,
          safetyWarning: false,
          riskLevel: "low",
        });
      }
    }
    
    // Translate ALL user messages in the conversation to maintain context consistency
    const translatedMessages = await Promise.all(
      messages.map(async (m: any) => {
        if (m.role === "user") {
          const msgLanguage = detectLanguage(m.content);
          if (msgLanguage === "bn") {
            try {
              const translated = await translateToEnglish(m.content);
              return { ...m, content: translated };
            } catch (error) {
              console.error("Translation error for message:", error);
              return m;
            }
          }
        }
        return m;
      })
    );
    
    // Translate the last user message separately for safety check
    let translatedUserMessage = lastUserMessage;
    if (userLanguage === "bn") {
      try {
        translatedUserMessage = await translateToEnglish(lastUserMessage);
        // Log for debugging translation accuracy
        console.log("Translation:", { original: lastUserMessage, translated: translatedUserMessage });
      } catch (error) {
        console.error("Translation error:", error);
        translatedUserMessage = lastUserMessage;
      }
    }
    
    // Safety check
    const safetyCheck = checkSafety(translatedUserMessage, profileContext);
    
    // If critical emergency, return immediate response
    if (safetyCheck.requiresEmergency) {
      const emergencyMessage = `${safetyCheck.recommendation}\n\nPlease seek immediate medical attention. This is a medical emergency.`;
      const finalReply = userLanguage === "bn" 
        ? await translateToBangla(emergencyMessage).catch(() => emergencyMessage)
        : emergencyMessage;
      
      return NextResponse.json({
        reply: finalReply,
        safetyWarning: true,
        riskLevel: safetyCheck.riskLevel,
      });
    }
    
    // Get AI response in English with timeout handling
    let reply: string;
    try {
      // Add timeout wrapper to prevent 502 errors
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout - AI response took too long")), 55000); // 55 seconds timeout
      });
      
      reply = await Promise.race([
        askMomsCare(translatedMessages, profileContext, prescriptionUrls, weeksPregnant),
        timeoutPromise
      ]) as string;
      
      // Validate and clean the response
      reply = reply.trim();
      
      // Check for empty or very short responses
      if (!reply || reply.length < 3) {
        throw new Error("Received empty or invalid response from AI");
      }
      
      // Check if response is just error messages or placeholders
      if (reply.toLowerCase().includes("error") && reply.length < 50) {
        throw new Error("AI returned an error response");
      }
      
    } catch (error: any) {
      console.error("AI chat error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      
      if (error.message && (error.message.includes("token") || error.message.includes("length") || error.message.includes("limit"))) {
        const errorMessage = userLanguage === "bn"
          ? "আপনার প্রশ্নটি খুব দীর্ঘ। অনুগ্রহ করে একটি ছোট প্রশ্ন করুন।"
          : "Your question is too long. Please ask a shorter question.";
        
        return NextResponse.json({
          reply: errorMessage,
          safetyWarning: false,
          riskLevel: "low",
        });
      }
      
      // Check for API key or configuration errors
      if (error.message && (error.message.includes("API") || error.message.includes("configured") || error.message.includes("key"))) {
        const errorMessage = userLanguage === "bn"
          ? "সিস্টেম কনফিগারেশন সমস্যা। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
          : "System configuration issue. Please try again in a moment.";
        
        return NextResponse.json({
          reply: errorMessage,
          safetyWarning: false,
          riskLevel: "low",
        });
      }
      
      // Check for rate limiting
      if (error.message && (error.message.includes("rate limit") || error.message.includes("busy"))) {
        const errorMessage = userLanguage === "bn"
          ? "সার্ভিস ব্যস্ত। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
          : "Service is busy. Please try again in a moment.";
        
        return NextResponse.json({
          reply: errorMessage,
          safetyWarning: false,
          riskLevel: "low",
        });
      }
      
      // Check for timeout errors
      if (error.message && (error.message.includes("timeout") || error.message.includes("too long"))) {
        const errorMessage = userLanguage === "bn"
          ? "আপনার প্রশ্নের উত্তর পেতে একটু বেশি সময় লাগছে। অনুগ্রহ করে একটি ছোট প্রশ্ন করুন বা কিছুক্ষণ পর আবার চেষ্টা করুন।"
          : "Your question is taking too long to answer. Please ask a shorter question or try again in a moment.";
        
        return NextResponse.json({
          reply: errorMessage,
          safetyWarning: false,
          riskLevel: "low",
        });
      }
      
      // Generic error message with more helpful info
      const errorMessage = userLanguage === "bn"
        ? "দুঃখিত, একটি সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
        : "Sorry, something went wrong. Please try again in a moment.";
      
      return NextResponse.json({
        reply: errorMessage,
        safetyWarning: false,
        riskLevel: "low",
      });
    }
    
    // Add safety warnings if needed
    if (safetyCheck.riskLevel === "high" && safetyCheck.recommendation) {
      reply = `${safetyCheck.recommendation}\n\n${reply}`;
    } else if (safetyCheck.riskLevel === "medium" && safetyCheck.recommendation) {
      reply = `${safetyCheck.recommendation}\n\n${reply}`;
    }
    
    // Translate response back to Bangla if user asked in Bangla/Banglish
    let finalReply = reply;
    if (userLanguage === "bn") {
      try {
        finalReply = await translateToBangla(reply);
      } catch (error) {
        console.error("Translation error:", error);
        finalReply = reply;
      }
    }
    
    return NextResponse.json({
      reply: finalReply.trim(),
      safetyWarning: safetyCheck.riskLevel !== "low",
      riskLevel: safetyCheck.riskLevel,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to process chat request",
        message: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}
