import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getQuestion, saveQuestion } from "@/lib/data";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only doctors can answer questions, not nurses/others
  const { getDoctor } = await import("@/lib/data");
  const doctor = await getDoctor(user.id);
  if (!doctor || doctor.role !== "doctor") {
    return NextResponse.json({ error: "Only doctors can answer questions" }, { status: 403 });
  }

  const { questionId, answer } = await req.json();
  if (!questionId || !answer) {
    return NextResponse.json({ error: "QuestionId and answer required" }, { status: 400 });
  }

  const question = await getQuestion(questionId);
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const updated = {
    ...question,
    answer,
    doctorId: user.id,
    answeredAt: new Date().toISOString(),
    hasNewActivity: true, // Mark as having new activity for mother
  };

  await saveQuestion(updated);
  return NextResponse.json({ question: updated });
}

