import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getConversationsList, createConversation } from "@/lib/data";

// GET: List all conversations for logged-in mother
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user || user.role !== "mother") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const conversations = await getConversationsList(user.id);
    
    // Sort by updatedAt (most recent first)
    conversations.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    
    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error("Conversations GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST: Create new conversation
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user || user.role !== "mother") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { firstMessage } = body;
    
    if (!firstMessage || typeof firstMessage !== "string") {
      return NextResponse.json(
        { error: "First message is required" },
        { status: 400 }
      );
    }

    const conversation = await createConversation(user.id, firstMessage);
    
    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error("Conversations POST error:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}

