import { NextRequest, NextResponse } from "next/server";
import { getLiveChatConversation, saveLiveChatConversation, LiveChatMessage } from "@/lib/data";

// GET - Get conversation by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversation = await getLiveChatConversation(id);
    
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
  }
}

