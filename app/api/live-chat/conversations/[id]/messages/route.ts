import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getLiveChatConversation, saveLiveChatConversation, LiveChatMessage } from "@/lib/data";
import { getUserFromRequest } from "@/lib/auth";

// POST - Send message in conversation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { content, sessionId } = body;

    if (!content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    const conversation = await getLiveChatConversation(id);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Check if user is logged in
    const user = await getUserFromRequest(req);
    let senderId: string;
    let senderType: "admin" | "user";
    let senderName: string;

    if (user && user.role === "admin") {
      senderId = "admin";
      senderType = "admin";
      senderName = "Admin";
    } else {
      senderId = conversation.userId || sessionId || "user";
      senderType = "user";
      senderName = conversation.userName;
    }

    const message: LiveChatMessage = {
      id: uuid(),
      conversationId: id,
      senderId,
      senderType,
      senderName,
      content,
      createdAt: new Date().toISOString(),
      read: false,
    };

    conversation.messages.push(message);
    conversation.updatedAt = new Date().toISOString();
    conversation.lastMessageAt = new Date().toISOString();

    await saveLiveChatConversation(conversation);

    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

