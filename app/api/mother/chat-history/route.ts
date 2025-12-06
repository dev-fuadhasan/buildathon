import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getChatHistory, updateChatHistory, ChatMessage } from "@/lib/data";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    
    if (!user || user.role !== "mother") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const history = await getChatHistory(user.id);
    
    return NextResponse.json({
      messages: history?.messages || [],
    });
  } catch (error: any) {
    console.error("Chat history GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    
    if (!user || user.role !== "mother") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const messages: ChatMessage[] = body.messages || [];
    
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages must be an array" },
        { status: 400 }
      );
    }

    await updateChatHistory(user.id, messages);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Chat history POST error:", error);
    return NextResponse.json(
      { error: "Failed to save chat history" },
      { status: 500 }
    );
  }
}

