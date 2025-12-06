import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getQuestion, saveQuestion } from "@/lib/data";

/**
 * Allows mother to report a question/answer/doctor
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { reason } = await req.json();
    
    const question = await getQuestion(id);
    
    if (!question || question.motherId !== user.id) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    if (!question.answer) {
      return NextResponse.json(
        { error: "Cannot report a question that hasn't been answered yet" },
        { status: 400 }
      );
    }

    // Mark question as reported
    const updated = {
      ...question,
      reported: true,
      reportReason: reason || "No reason provided",
      reportedBy: user.id,
      reportedAt: new Date().toISOString(),
    };

    await saveQuestion(updated);

    return NextResponse.json({ success: true, message: "Report submitted successfully" });
  } catch (error: any) {
    console.error("Report error:", error);
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 }
    );
  }
}

