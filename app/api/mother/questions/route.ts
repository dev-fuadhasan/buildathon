import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listMotherQuestions, saveQuestion } from "@/lib/data";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "mother") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const questions = await listMotherQuestions(user.id);
  // Ensure comments are included and check for new activity
  const questionsWithComments = questions.map(q => {
    const lastSeen = q.lastSeenByMother ? new Date(q.lastSeenByMother).getTime() : 0;
    const answerTime = q.answeredAt ? new Date(q.answeredAt).getTime() : 0;
    const latestCommentTime = q.comments && q.comments.length > 0
      ? Math.max(...q.comments.map(c => new Date(c.createdAt).getTime()))
      : 0;
    
    const hasNewActivity = (answerTime > lastSeen) || (latestCommentTime > lastSeen);
    
    return {
      ...q,
      comments: q.comments || [],
      hasNewActivity,
    };
  });
  return NextResponse.json({ questions: questionsWithComments });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "mother") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { question } = await req.json();
  if (!question) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }
  const payload = {
    id: uuid(),
    motherId: user.id,
    question,
    createdAt: new Date().toISOString(),
  };
  await saveQuestion(payload);
  return NextResponse.json({ question: payload });
}

