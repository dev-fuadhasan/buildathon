import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getQuestion, saveQuestion } from "@/lib/data";

/**
 * Marks a question as seen by the mother (clears notification)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const question = await getQuestion(id);
    
    if (!question || question.motherId !== user.id) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Update last seen timestamp
    const updated = {
      ...question,
      lastSeenByMother: new Date().toISOString(),
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

