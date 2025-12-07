import { NextRequest, NextResponse } from "next/server";
import { getLiveChatConversation, saveLiveChatConversation } from "@/lib/data";
import { getUserFromRequest } from "@/lib/auth";

// POST - Mark messages as read (admin viewing conversation)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversation = await getLiveChatConversation(id);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Mark all user messages as read
    let hasChanges = false;
    conversation.messages = conversation.messages.map(msg => {
      if (msg.senderType === "user" && !msg.read) {
        hasChanges = true;
        return { ...msg, read: true };
      }
      return msg;
    });
    
    // Only update if there were changes
    if (!hasChanges) {
      return NextResponse.json({ conversation });
    }

    conversation.updatedAt = new Date().toISOString();
    await saveLiveChatConversation(conversation);

    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json({ error: "Failed to mark messages as read" }, { status: 500 });
  }
}

