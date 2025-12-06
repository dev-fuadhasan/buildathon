import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getQuestion, saveQuestion } from "@/lib/data";

/**
 * Marks a question as seen by the doctor (clears notification)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const question = await getQuestion(id);
    
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Update last seen timestamp
    const updated = {
      ...question,
      lastSeenByDoctor: new Date().toISOString(),
      hasNewActivity: false,
    };

    await saveQuestion(updated);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Mark seen error:", error);
    return NextResponse.json(
      { error: "Failed to mark as seen" },
      { status: 500 }
    );
  }
}

