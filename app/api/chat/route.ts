import { NextRequest, NextResponse } from "next/server";
import { askMomsCare } from "@/lib/momsCareChat";
import { getUserFromRequest } from "@/lib/auth";
import { getMother } from "@/lib/data";
import { listObjects, signedUrl } from "@/lib/r2Client";
import { checkSafety } from "@/lib/safetyGuardrails";

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

    const user = getUserFromRequest(req);

    let profileContext: string | undefined = body.profileContext;
    let prescriptionUrls: string[] = [];
    
    if (user?.role === "mother") {
      try {
        const mother = await getMother(user.id);
        let weeksPregnant: number | undefined;
        if (mother) {
          profileContext = `
Name: ${mother.name || "N/A"}
Weeks pregnant: ${mother.weeksPregnant || "N/A"}
Due date: ${mother.dueDate || "N/A"}
Conditions: ${mother.conditions || "N/A"}
Medications: ${mother.medications || "N/A"}`;
          weeksPregnant = mother.weeksPregnant;
          
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

    // Safety check: Get the last user message for red flag detection
    const lastUserMessage = messages
      .filter((m: any) => m.role === "user")
      .pop()?.content || "";
    
    const safetyCheck = checkSafety(lastUserMessage, profileContext);
    
    // If critical emergency, return immediate response without AI processing
    if (safetyCheck.requiresEmergency) {
      return NextResponse.json({
        reply: `${safetyCheck.recommendation}\n\nPlease seek immediate medical attention. This is a medical emergency.`,
        safetyWarning: true,
        riskLevel: safetyCheck.riskLevel,
      });
    }
    
    // If high risk, prepend warning to AI response
    let reply = await askMomsCare(messages, profileContext, prescriptionUrls, weeksPregnant);
    
    if (safetyCheck.riskLevel === "high" && safetyCheck.recommendation) {
      reply = `${safetyCheck.recommendation}\n\n${reply}`;
    } else if (safetyCheck.riskLevel === "medium" && safetyCheck.recommendation) {
      reply = `${safetyCheck.recommendation}\n\n${reply}`;
    }
    
    return NextResponse.json({
      reply,
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

