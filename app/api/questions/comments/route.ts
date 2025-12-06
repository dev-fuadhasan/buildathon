import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getQuestion, saveQuestion, type Comment } from "@/lib/data";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || (user.role !== "doctor" && user.role !== "mother")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questionId, content, parentCommentId } = await req.json();
  
  if (!questionId || !content) {
    return NextResponse.json(
      { error: "Question ID and content are required" },
      { status: 400 }
    );
  }

  const question = await getQuestion(questionId);
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const comment: Comment = {
    id: uuid(),
    questionId,
    authorId: user.id,
    authorRole: user.role === "doctor" ? "doctor" : "mother",
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  if (!question.comments) {
    question.comments = [];
  }

  if (parentCommentId) {
    // This is a reply to a comment
    const parentComment = question.comments.find(c => c.id === parentCommentId);
    if (!parentComment) {
      return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
    }
    if (!parentComment.replies) {
      parentComment.replies = [];
    }
    parentComment.replies.push(comment);
  } else {
    // This is a top-level comment
    question.comments.push(comment);
  }

  // Mark question as having new activity for the other party
  // If doctor commented, mother should see notification
  // If mother commented, doctor should see notification
  question.hasNewActivity = true;
  
  await saveQuestion(question);
  return NextResponse.json({ comment });
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get("questionId");
  
  if (!questionId) {
    return NextResponse.json(
      { error: "Question ID is required" },
      { status: 400 }
    );
  }

  const question = await getQuestion(questionId);
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  return NextResponse.json({ comments: question.comments || [] });
}

