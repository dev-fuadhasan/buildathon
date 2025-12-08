import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getConversation, saveConversation, ChatMessage } from "@/lib/data";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST: Add messages to conversation
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromRequest(req);
    
    if (!user || user.role !== "mother") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { messages } = body;
    
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages must be an array" },
        { status: 400 }
      );
    }

    const conversation = await getConversation(user.id, id);
    
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (conversation.motherId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Update conversation with new messages
    conversation.messages = messages as ChatMessage[];
    conversation.updatedAt = new Date().toISOString();
    
    await saveConversation(conversation);
    
    return NextResponse.json({ success: true, conversation });
  } catch (error: any) {
    console.error("Conversation messages POST error:", error);
    return NextResponse.json(
      { error: "Failed to save messages" },
      { status: 500 }
    );
  }
}

