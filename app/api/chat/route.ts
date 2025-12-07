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
    
    // Translate user message to English if it's in Bangla/Banglish
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
    
    // Create translated messages array for AI processing
    const translatedMessages = messages.map((m: any) => {
      if (m.role === "user" && m.content === lastUserMessage) {
        return { ...m, content: translatedUserMessage };
      }
      return m;
    });
    
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
    let reply = await askMomsCare(translatedMessages, profileContext, prescriptionUrls, weeksPregnant);
    
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
    return NextResponse.json(
      { 
        error: "Failed to process chat request",
        message: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

