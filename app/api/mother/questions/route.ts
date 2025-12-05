import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listMotherQuestions, saveQuestion } from "@/lib/data";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "mother") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const questions = await listMotherQuestions(user.id);
  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
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

