import { NextRequest, NextResponse } from "next/server";
import { askMomsCare } from "@/lib/momsCareChat";
import { getUserFromRequest } from "@/lib/auth";
import { getMother, getChatHistory, updateChatHistory, listDailyEntries, listMotherQuestions, ChatMessage } from "@/lib/data";
import { listObjects, signedUrl } from "@/lib/r2Client";
import { checkSafety } from "@/lib/safetyGuardrails";
import { detectLanguage, translateToEnglish, translateToBangla } from "@/lib/translation";
import { isPersonalQuestion, needsFollowUpQuestions } from "@/lib/chatHelper";
import { getCurrentDateInTimezone } from "@/lib/pregnancyTracker";

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
    const imageUrl = body.imageUrl || null; // Optional image URL
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Check if user is logged in
    const user = await getUserFromRequest(req);
    const isLoggedIn = user?.role === "mother";
    
    // ============================================================
    // LOGGED-OUT USER (GUEST MODE) - Start fresh session
    // ============================================================
    if (!isLoggedIn) {
      // For logged-out users: Use only current session messages
      // No history, no profile, no personalization
      messages = cleanMessages(messages);
      messages = limitConversationHistory(messages, 18);
      
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
      
      // Detect language (for safety check only)
      const userLanguage = detectLanguage(lastUserMessage);
      
      // Translate only for safety check (safety check needs English)
      let translatedUserMessage = lastUserMessage;
      if (userLanguage === "bn") {
        try {
          translatedUserMessage = await translateToEnglish(lastUserMessage);
        } catch (error) {
          translatedUserMessage = lastUserMessage;
        }
      }
      
      // Safety check (uses translated message)
      const safetyCheck = checkSafety(translatedUserMessage, undefined);
      
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
      
      // Get AI response (no profile context for guests)
      let reply: string;
      try {
        const timeoutPromise = new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error("Request timeout")), 55000);
        });
        
        // Prepare image URLs array
        const imageUrls = imageUrl ? [imageUrl] : [];
        
        // Send messages directly to AI in original language (no translation)
        reply = await Promise.race([
          askMomsCare(messages, undefined, imageUrls, undefined, false, false),
          timeoutPromise
        ]) as string;
        
        reply = reply.trim();
        
        if (!reply || reply.length < 3) {
          throw new Error("Empty response from AI");
        }
      } catch (error: any) {
        console.error("AI chat error:", error);
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
      
      // AI responds directly in user's language (no translation needed)
      // DO NOT store chat history for logged-out users
      return NextResponse.json({
        reply: reply.trim(),
        safetyWarning: safetyCheck.riskLevel !== "low",
        riskLevel: safetyCheck.riskLevel,
      });
    }
    
    // ============================================================
    // LOGGED-IN MOTHER (SMART PERSONALIZED MODE)
    // ============================================================
    
    // Load previous chat history for logged-in mothers
    let previousChatHistory: ChatMessage[] = [];
    try {
      const history = await getChatHistory(user!.id);
      if (history && history.messages && history.messages.length > 0) {
        previousChatHistory = history.messages;
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
    
    // Merge previous history with current session messages
    // Current session messages take priority (they're the latest)
    const allMessages = [...previousChatHistory, ...messages];
    messages = cleanMessages(allMessages);
    messages = limitConversationHistory(messages, 20); // Allow more history for logged-in users
    
    // Get the last user message to detect question type FIRST
    const currentUserMessage = messages
      .filter((m: any) => m.role === "user")
      .pop()?.content || "";
    
    if (!currentUserMessage.trim()) {
      return NextResponse.json(
        { error: "User message is required" },
        { status: 400 }
      );
    }
    
    // ==========================================
    // STEP 1: Classify question type (Personal vs General)
    // ==========================================
    const isPersonal = isPersonalQuestion(currentUserMessage);
    
    console.log(`[Question Type] ${isPersonal ? "PERSONAL" : "GENERAL"}: "${currentUserMessage.substring(0, 50)}..."`);
    
    // ==========================================
    // STEP 2: Load profile data ONLY if question is PERSONAL
    // ==========================================
    let profileContext: string | undefined = undefined;
    let prescriptionUrls: string[] = [];
    let weeksPregnant: number | undefined;
    
    if (isPersonal) {
      // Load comprehensive mother data for PERSONAL questions
      console.log("[Profile Loading] Personal question detected - loading full profile...");
      
      try {
        const mother = await getMother(user!.id);
        if (mother) {
          const daysPregnant = mother.daysPregnant || (mother.weeksPregnant ? mother.weeksPregnant * 7 : undefined);
          const weeks = daysPregnant ? Math.floor(daysPregnant / 7) : mother.weeksPregnant;
          const months = weeks ? Math.round(weeks / 4.33) : undefined;
          
          // Build comprehensive profile context
          const profileParts: string[] = [];
          
          // Basic profile
          if (mother.name) profileParts.push(`নাম: ${mother.name}`);
          if (mother.age) profileParts.push(`বয়স: ${mother.age}`);
          if (weeks) profileParts.push(`গর্ভাবস্থার সপ্তাহ: ${weeks} সপ্তাহ (${months || Math.round(weeks / 4.33)} মাস)`);
          if (mother.dueDate) profileParts.push(`প্রত্যাশিত তারিখ: ${mother.dueDate}`);
          if (mother.bloodGroup) profileParts.push(`রক্তের গ্রুপ: ${mother.bloodGroup}`);
          if (mother.previousPregnancies !== undefined) profileParts.push(`আগের গর্ভাবস্থা: ${mother.previousPregnancies}`);
          
          // Medical history
          if (mother.conditions) profileParts.push(`চিকিৎসা অবস্থা/জটিলতা: ${mother.conditions}`);
          if (mother.allergies) profileParts.push(`অ্যালার্জি: ${mother.allergies}`);
          if (mother.medications) profileParts.push(`বর্তমান ওষুধ: ${mother.medications}`);
          if (mother.emergencyContact) profileParts.push(`জরুরি যোগাযোগ: ${mother.emergencyContact} (${mother.emergencyPhone || "N/A"})`);
          
          // Load daily entries for recent activity
          try {
            const dailyEntries = await listDailyEntries(user!.id);
            const today = getCurrentDateInTimezone(mother.timezone || "Asia/Dhaka");
            const recentEntries = dailyEntries
              .filter(entry => entry.date === today || entry.date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
              .slice(0, 5)
              .map(entry => entry.entry);
            
            if (recentEntries.length > 0) {
              profileParts.push(`\nসাম্প্রতিক দৈনিক এন্ট্রি:\n${recentEntries.join("\n")}`);
            }
          } catch (err) {
            console.error("Failed to load daily entries:", err);
          }
          
          // Load recent doctor Q&A
          try {
            const questions = await listMotherQuestions(user!.id);
            const recentQAs = questions
              .filter(q => q.answer)
              .sort((a, b) => new Date(b.answeredAt || b.createdAt).getTime() - new Date(a.answeredAt || a.createdAt).getTime())
              .slice(0, 3)
              .map(q => `Q: ${q.question}\nA: ${q.answer}`);
            
            if (recentQAs.length > 0) {
              profileParts.push(`\nসাম্প্রতিক ডাক্তারের পরামর্শ:\n${recentQAs.join("\n\n")}`);
            }
          } catch (err) {
            console.error("Failed to load questions:", err);
          }
          
          profileContext = profileParts.length > 0 
            ? `MOTHER PROFILE DATA:\n${profileParts.join("\n")}`
            : undefined;
          weeksPregnant = weeks;
          
          // Load prescriptions
          try {
            const prefix = `prescriptions/${user!.id}/`;
            const objects = await listObjects(prefix);
            prescriptionUrls = await Promise.all(
              (objects || []).slice(0, 5).map(async (obj) => await signedUrl(obj.Key!))
            );
          } catch (err) {
            console.error("Failed to fetch prescriptions:", err);
          }
          
          // Add chat image if provided
          if (imageUrl) {
            prescriptionUrls.push(imageUrl);
          }
          
          console.log(`[Profile Loaded] Profile: ${profileParts.length} sections, Prescriptions: ${prescriptionUrls.length}`);
        }
      } catch (err) {
        console.error("Failed to fetch mother profile:", err);
      }
    } else {
      // For GENERAL questions, don't load profile but still add chat image if provided
      if (imageUrl) {
        prescriptionUrls = [imageUrl];
      }
      console.log("[Profile Loading] General question detected - skipping profile load");
    }

    // Detect language of user message
    const userLanguage = detectLanguage(currentUserMessage);
    
    // Estimate token count
    const allMessagesText = JSON.stringify(messages) + (profileContext || "");
    const estimatedTokens = Math.ceil(allMessagesText.length / 3.5);
    
    // Check if token limit is exceeded
    if (estimatedTokens > 6000) {
      messages = limitConversationHistory(messages, 12);
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
    
    // Translate ALL user messages
    const translatedMessages = await Promise.all(
      messages.map(async (m: any) => {
        if (m.role === "user") {
          const msgLanguage = detectLanguage(m.content);
          if (msgLanguage === "bn") {
            try {
              const translated = await translateToEnglish(m.content);
              return { ...m, content: translated };
            } catch (error) {
              return m;
            }
          }
        }
        return m;
      })
    );
    
    // Translate last message for safety check
    let translatedUserMessage = currentUserMessage;
    if (userLanguage === "bn") {
      try {
        translatedUserMessage = await translateToEnglish(currentUserMessage);
      } catch (error) {
        translatedUserMessage = currentUserMessage;
      }
    }
    
    // Safety check
    const safetyCheck = checkSafety(translatedUserMessage, profileContext);
    
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
    
    // Get AI response with personalization metadata
    let reply: string;
    try {
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 55000);
      });
      
      // Send messages directly to AI in original language (no translation)
      reply = await Promise.race([
        askMomsCare(messages, profileContext, prescriptionUrls, weeksPregnant, isPersonal, true),
        timeoutPromise
      ]) as string;
      
      reply = reply.trim();
      
      if (!reply || reply.length < 3) {
        throw new Error("Empty response from AI");
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
    
    // AI responds directly in user's language (no translation needed)
    // Store chat history for logged-in mothers only
    try {
      const updatedMessages: ChatMessage[] = messages.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date().toISOString(),
      }));
      
      // Add the new assistant response
      updatedMessages.push({
        role: "assistant",
        content: reply.trim(),
        timestamp: new Date().toISOString(),
      });
      
      await updateChatHistory(user!.id, updatedMessages);
    } catch (err) {
      console.error("Failed to save chat history:", err);
      // Don't fail the request if history save fails
    }
    
    return NextResponse.json({
      reply: reply.trim(),
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

