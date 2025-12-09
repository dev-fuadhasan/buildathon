import { NextRequest, NextResponse } from "next/server";
import { askMomsCare } from "@/lib/momsCareChat";
import { getUserFromRequest } from "@/lib/auth";
import { getChatHistory, updateChatHistory, ChatMessage } from "@/lib/data";
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
    // LOGGED-IN MOTHER (AI-POWERED PERSONALIZED MODE)
    // ============================================================
    
    // Clean and limit current session messages
    messages = cleanMessages(messages);
    messages = limitConversationHistory(messages, 15);
    
    const currentUserMessage = messages
      .filter((m: any) => m.role === "user")
      .pop()?.content || "";
    
    if (!currentUserMessage.trim()) {
      return NextResponse.json(
        { error: "User message is required" },
        { status: 400 }
      );
    }
    
    // Detect language
    const userLanguage = detectLanguage(currentUserMessage);
    
    // Safety check (on original message)
    const safetyCheck = checkSafety(currentUserMessage);
    
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
    
    // AI-POWERED: Determine if question is personal and needs profile data
    const { isPersonalQuestion } = await import("@/lib/chatHelper");
    const isPersonal = await isPersonalQuestion(currentUserMessage);
    
    console.log(`[Question Type] ${isPersonal ? "PERSONAL" : "GENERAL"}: "${currentUserMessage.substring(0, 50)}..."`);
    
    // Load ALL profile data if AI determines question is personal
    let profileContext: string | undefined = undefined;
    let prescriptionUrls: string[] = [];
    let weeksPregnant: number | undefined;
    
    if (isPersonal) {
      console.log("[AI Decision] Personal question - loading FULL profile data...");
      
      try {
        const { getMother, listDailyEntries, listMotherQuestions } = await import("@/lib/data");
        const { listObjects, signedUrl } = await import("@/lib/r2Client");
        const { getCurrentDateInTimezone } = await import("@/lib/pregnancyTracker");
        
        const mother = await getMother(user!.id);
        if (mother) {
          const daysPregnant = mother.daysPregnant || (mother.weeksPregnant ? mother.weeksPregnant * 7 : undefined);
          const weeks = daysPregnant ? Math.floor(daysPregnant / 7) : mother.weeksPregnant;
          const months = weeks ? Math.round(weeks / 4.33) : undefined;
          
          // Build comprehensive profile context
          const profileParts: string[] = [];
          
          // Basic profile (ALL fields from dashboard)
          profileParts.push("=== HEALTH PROFILE ===");
          if (mother.name) profileParts.push(`Full Name: ${mother.name}`);
          if (mother.email) profileParts.push(`Email: ${mother.email}`);
          if (mother.age) profileParts.push(`Age: ${mother.age}`);
          if (daysPregnant) profileParts.push(`Days Pregnant: ${daysPregnant} days (${weeks} weeks, ${months} months)`);
          if (mother.phone) profileParts.push(`Phone: ${mother.phone}`);
          if (mother.bloodGroup) profileParts.push(`Blood Group: ${mother.bloodGroup}`);
          if (mother.previousPregnancies !== undefined) profileParts.push(`Previous Pregnancies: ${mother.previousPregnancies}`);
          if (mother.address) profileParts.push(`Address: ${mother.address}`);
          if (mother.dueDate) profileParts.push(`Due Date: ${mother.dueDate}`);
          if (mother.conditions) profileParts.push(`Medical Conditions: ${mother.conditions}`);
          if (mother.allergies) profileParts.push(`Allergies: ${mother.allergies}`);
          if (mother.medications) profileParts.push(`Current Medications: ${mother.medications}`);
          if (mother.emergencyContact) profileParts.push(`Emergency Contact Name: ${mother.emergencyContact}`);
          if (mother.emergencyPhone) profileParts.push(`Emergency Contact Phone: ${mother.emergencyPhone}`);
          
          // Load daily entries
          try {
            const dailyEntries = await listDailyEntries(user!.id);
            const today = getCurrentDateInTimezone(mother.timezone || "Asia/Dhaka");
            const recentEntries = dailyEntries
              .filter(entry => entry.date === today || entry.date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 10);
            
            console.log(`[Data Load] Daily Entries: ${recentEntries.length} entries found`);
            
            if (recentEntries.length > 0) {
              profileParts.push("\n=== RECENT DAILY ENTRIES ===");
              recentEntries.forEach((entry, idx) => {
                profileParts.push(`${idx + 1}. [${entry.date}] ${entry.entry}`);
              });
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
              .slice(0, 5);
            
            console.log(`[Data Load] Doctor Q&A: ${recentQAs.length} questions found`);
            
            if (recentQAs.length > 0) {
              profileParts.push("\n=== RECENT DOCTOR Q&A ===");
              recentQAs.forEach((qa, idx) => {
                profileParts.push(`${idx + 1}. Q: ${qa.question}`);
                profileParts.push(`   A: ${qa.answer}`);
              });
            }
          } catch (err) {
            console.error("Failed to load doctor Q&A:", err);
          }
          
          // Load chat history (previous conversations)
          try {
            const { getChatHistory } = await import("@/lib/data");
            const history = await getChatHistory(user!.id);
            
            console.log(`[Data Load] Chat History: ${history?.messages?.length || 0} messages found`);
            
            if (history?.messages && history.messages.length > 0) {
              const recentHistory = history.messages
                .slice(-10) // Last 10 messages
                .map((msg, idx) => `${idx + 1}. ${msg.role === "user" ? "Mother" : "AI"}: ${msg.content.substring(0, 150)}...`);
              
              if (recentHistory.length > 0) {
                profileParts.push("\n=== RECENT CHAT HISTORY ===");
                profileParts.push(...recentHistory);
              }
            }
          } catch (err) {
            console.error("Failed to load chat history:", err);
          }
          
          profileContext = profileParts.length > 0 ? profileParts.join("\n") : undefined;
          weeksPregnant = weeks;
          
          // Load prescriptions (limit to 3 for speed)
          try {
            const prefix = `prescriptions/${user!.id}/`;
            const objects = await listObjects(prefix);
            prescriptionUrls = await Promise.all(
              (objects || []).slice(0, 3).map(async (obj) => await signedUrl(obj.Key!))
            );
            console.log(`[Data Load] Prescriptions: ${prescriptionUrls.length} files found`);
          } catch (err) {
            console.error("Failed to fetch prescriptions:", err);
          }
          
          // Add chat image if provided
          if (imageUrl) {
            prescriptionUrls.push(imageUrl);
          }
          
          console.log(`[✅ FULL PROFILE LOADED] Sections: ${profileParts.length}, Prescriptions: ${prescriptionUrls.length}, Total context chars: ${profileContext?.length || 0}`);
        }
      } catch (err) {
        console.error("Failed to fetch mother profile:", err);
      }
    } else {
      // For GENERAL questions, only add chat image if provided
      if (imageUrl) {
        prescriptionUrls = [imageUrl];
      }
      console.log("[AI Decision] General question - skipping profile load");
    }
    
    // Get AI response with profile data (if personal)
    let reply: string;
    try {
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 30000);
      });
      
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
    
    // Prepare response FIRST (for speed)
    const responseData = {
      reply: reply.trim(),
      safetyWarning: safetyCheck.riskLevel !== "low",
      riskLevel: safetyCheck.riskLevel,
    };
    
    // Save chat history in background (don't wait)
    // Fire-and-forget: save after response is sent
    const saveHistory = async () => {
      try {
        // Load previous history
        let previousHistory: ChatMessage[] = [];
        try {
          const history = await getChatHistory(user!.id);
          if (history?.messages) {
            previousHistory = history.messages;
          }
        } catch (err) {
          console.error("Failed to load previous history:", err);
        }
        
        // Merge previous + current session messages
        const allMessages = [...previousHistory, ...messages];
        const cleanedMessages = cleanMessages(allMessages);
        const limitedMessages = limitConversationHistory(cleanedMessages, 20);
        
        const updatedMessages: ChatMessage[] = limitedMessages.map((m: any) => ({
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
        console.log(`[History] Saved ${updatedMessages.length} messages for user ${user!.id}`);
      } catch (err) {
        console.error("Failed to save chat history:", err);
      }
    };
    
    // Trigger save in background (don't await)
    saveHistory();
    
    // Return response immediately
    return NextResponse.json(responseData);
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

