import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getQuestion, saveQuestion } from "@/lib/data";

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  };

  await saveQuestion(updated);
  return NextResponse.json({ question: updated });
}

