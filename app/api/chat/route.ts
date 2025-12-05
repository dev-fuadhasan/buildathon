import { NextRequest, NextResponse } from "next/server";
import { askMomsCare } from "@/lib/momsCareChat";
import { getUserFromRequest } from "@/lib/auth";
import { getMother } from "@/lib/data";
import { listObjects, signedUrl } from "@/lib/r2Client";

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
        if (mother) {
          profileContext = `
Name: ${mother.name || "N/A"}
Weeks pregnant: ${mother.weeksPregnant || "N/A"}
Due date: ${mother.dueDate || "N/A"}
Conditions: ${mother.conditions || "N/A"}
Medications: ${mother.medications || "N/A"}`;
          
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

    const reply = await askMomsCare(messages, profileContext, prescriptionUrls);
    return NextResponse.json({ reply });
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

