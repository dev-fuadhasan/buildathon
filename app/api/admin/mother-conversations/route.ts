import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getConversationsList, getConversation } from "@/lib/data";

/**
 * GET: Get all conversations for a specific mother (admin only)
 * Query params: motherId (required)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const motherId = searchParams.get("motherId");
    
    if (!motherId) {
      return NextResponse.json({ error: "Mother ID required" }, { status: 400 });
    }

    // Get list of conversations
    const conversationsList = await getConversationsList(motherId);
    
    // Get full conversation details for each
    const conversations = await Promise.all(
      conversationsList.map(async (conv) => {
        const fullConversation = await getConversation(motherId, conv.id);
        return fullConversation;
      })
    );

    // Filter out null conversations and sort by updatedAt (most recent first)
    const validConversations = conversations
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

    return NextResponse.json({ 
      conversations: validConversations,
      count: validConversations.length 
    });
  } catch (error: any) {
    console.error("Admin mother conversations GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

