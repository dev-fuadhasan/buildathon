import { NextRequest, NextResponse } from "next/server";
import { askMomsCare } from "@/lib/momsCareChat";
import { getUserFromRequest } from "@/lib/auth";
import { getMother } from "@/lib/data";
import { listObjects, signedUrl } from "@/lib/r2Client";
import { checkSafety } from "@/lib/safetyGuardrails";
import { detectLanguage, translateToEnglish, translateToBangla } from "@/lib/translation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages || [];
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const user = await getUserFromRequest(req);

    let profileContext: string | undefined = body.profileContext;
    let prescriptionUrls: string[] = [];
    let weeksPregnant: number | undefined;
    
    if (user?.role === "mother") {
      try {
        const mother = await getMother(user.id);
        if (mother) {
          // Use daysPregnant if available, otherwise calculate from weeksPregnant
          const daysPregnant = mother.daysPregnant || (mother.weeksPregnant ? mother.weeksPregnant * 7 : undefined);
          const weeks = daysPregnant ? Math.floor(daysPregnant / 7) : mother.weeksPregnant;
          
          profileContext = `
Name: ${mother.name || "N/A"}
Days pregnant: ${daysPregnant || "N/A"} (${weeks || "N/A"} weeks)
Conditions: ${mother.conditions || "N/A"}
Medications: ${mother.medications || "N/A"}`;
          weeksPregnant = weeks;
          
          // Fetch prescription URLs for image analysis
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
        // If profile fetch fails, continue without context
        console.error("Failed to fetch mother profile:", err);
      }
    }

    // Get the last user message
    const lastUserMessage = messages
      .filter((m: any) => m.role === "user")
      .pop()?.content || "";
    
    // Detect language of user message
    const userLanguage = detectLanguage(lastUserMessage);
    
    // Estimate token count (rough estimate: 1 token ≈ 4 characters)
    // Count all messages + system prompts
    const allMessagesText = JSON.stringify(messages) + (profileContext || "");
    const estimatedTokens = Math.ceil(allMessagesText.length / 4);
    
    // Check if token limit is exceeded (6000 tokens max)
    if (estimatedTokens > 5500) { // Leave some buffer
      const errorMessage = userLanguage === "bn"
        ? "আপনার প্রশ্নটি খুব দীর্ঘ। অনুগ্রহ করে একটি ছোট প্রশ্ন করুন। আপনি পরে আরও বিস্তারিত জানতে পারেন। অথবা আরও ভাল সাহায্যের জন্য লগইন করুন।"
        : "Your question is too long. Please ask a shorter question. You can add more details later. Or login for better assistance.";
      
      return NextResponse.json({
        reply: errorMessage,
        safetyWarning: false,
        riskLevel: "low",
      });
    }
    
    // Translate ALL user messages in the conversation to maintain context consistency
    // This ensures continuous questions work properly
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
              return m; // Keep original if translation fails
            }
          }
        }
        // Keep assistant messages as-is (they're already in English from previous responses)
        return m;
      })
    );
    
    // Translate the last user message separately for safety check
    let translatedUserMessage = lastUserMessage;
    if (userLanguage === "bn") {
      try {
        translatedUserMessage = await translateToEnglish(lastUserMessage);
        console.log("Original (Bangla/Banglish):", lastUserMessage);
        console.log("Translated (English):", translatedUserMessage);
      } catch (error) {
        console.error("Translation error:", error);
        // If translation fails, use original message
        translatedUserMessage = lastUserMessage;
      }
    }
    
    // Safety check: Use translated message for safety detection
    const safetyCheck = checkSafety(translatedUserMessage, profileContext);
    
    // If critical emergency, return immediate response without AI processing
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
    
    // Get AI response in English (always process in English for accuracy)
    let reply: string;
    try {
      reply = await askMomsCare(translatedMessages, profileContext, prescriptionUrls, weeksPregnant);
    } catch (error: any) {
      // Check if error is due to token limit
      if (error.message && (error.message.includes("token") || error.message.includes("length") || error.message.includes("limit"))) {
        const errorMessage = userLanguage === "bn"
          ? "আপনার প্রশ্নটি খুব দীর্ঘ। অনুগ্রহ করে একটি ছোট প্রশ্ন করুন। আপনি পরে আরও বিস্তারিত জানতে পারেন। অথবা আরও ভাল সাহায্যের জন্য লগইন করুন।"
          : "Your question is too long. Please ask a shorter question. You can add more details later. Or login for better assistance.";
        
        return NextResponse.json({
          reply: errorMessage,
          safetyWarning: false,
          riskLevel: "low",
        });
      }
      // Re-throw other errors
      throw error;
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
        console.log("AI Response (English):", reply);
        console.log("Translated Response (Bangla):", finalReply);
      } catch (error) {
        console.error("Translation error:", error);
        // If translation fails, use English response
        finalReply = reply;
      }
    }
    
    return NextResponse.json({
      reply: finalReply,
      safetyWarning: safetyCheck.riskLevel !== "low",
      riskLevel: safetyCheck.riskLevel,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    
    // Check if it's a token limit error
    if (error.message && (error.message.includes("token") || error.message.includes("length") || error.message.includes("limit"))) {
      return NextResponse.json({
        reply: "Your question is too long. Please ask a shorter question. You can add more details later. Or login for better assistance.",
        safetyWarning: false,
        riskLevel: "low",
      });
    }
    
    return NextResponse.json(
      { 
        error: "Failed to process chat request",
        message: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

