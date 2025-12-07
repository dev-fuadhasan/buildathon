import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getClientIP } from "@/lib/timezoneDetector";
import {
  getLiveChatConversation,
  saveLiveChatConversation,
  listLiveChatConversations,
  getConversationsBySession,
  getConversationsByUserId,
  getMother,
  getDoctor,
  LiveChatConversation,
} from "@/lib/data";
import { getUserFromRequest } from "@/lib/auth";

// GET - List conversations (for admin or user)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const userId = searchParams.get("userId");
    const conversationId = searchParams.get("conversationId");

    // If conversationId is provided, return that conversation
    if (conversationId) {
      const conversation = await getLiveChatConversation(conversationId);
      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      return NextResponse.json({ conversation });
    }

    // Check if admin
    const user = await getUserFromRequest(req);
    if (user && user.role === "admin") {
      // Admin can see all conversations
      const conversations = await listLiveChatConversations();
      return NextResponse.json({ conversations });
    }

    // For users, filter by session or userId
    if (sessionId) {
      const conversations = await getConversationsBySession(sessionId);
      return NextResponse.json({ conversations });
    }

    if (userId) {
      const conversations = await getConversationsByUserId(userId);
      return NextResponse.json({ conversations });
    }

    return NextResponse.json({ conversations: [] });
  } catch (error: any) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

// POST - Create new conversation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userType, name, phone, email, sessionId } = body;

    if (!userType || !name || !phone || !sessionId) {
      return NextResponse.json(
        { error: "userType, name, phone, and sessionId are required" },
        { status: 400 }
      );
    }

    // Check if user is logged in
    const user = await getUserFromRequest(req);
    let userId: string | undefined;
    let userTypeFromAuth: "mother" | "doctor" | undefined;

    if (user) {
      userId = user.id;
      userTypeFromAuth = user.role === "mother" ? "mother" : "doctor";
      
      // Get user details from database
      if (user.role === "mother") {
        const mother = await getMother(user.id);
        if (mother) {
          // Use database info if available
          const conversationId = uuid();
          const conversation: LiveChatConversation = {
            id: conversationId,
            userId: user.id,
            userType: "mother",
            userName: mother.name || name,
            userPhone: mother.phone || phone,
            userEmail: mother.email || email,
            sessionId,
            ipAddress: getClientIP(req) || undefined,
            messages: [
              {
                id: uuid(),
                conversationId: conversationId,
                senderId: "admin",
                senderType: "admin",
                senderName: "Admin",
                content: "Hello! Please write your issue so that we can solve it as soon as possible. We're here to help!",
                createdAt: new Date().toISOString(),
                read: false,
              },
            ],
            status: "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await saveLiveChatConversation(conversation);
          return NextResponse.json({ conversation });
        }
      } else if (user.role === "doctor") {
        const doctor = await getDoctor(user.id);
        if (doctor) {
          const conversationId = uuid();
          const conversation: LiveChatConversation = {
            id: conversationId,
            userId: user.id,
            userType: "doctor",
            userName: doctor.name || name,
            userPhone: doctor.phone || phone,
            userEmail: doctor.email || email,
            sessionId,
            ipAddress: getClientIP(req) || undefined,
            messages: [
              {
                id: uuid(),
                conversationId: conversationId,
                senderId: "admin",
                senderType: "admin",
                senderName: "Admin",
                content: "Hello! Please write your issue so that we can solve it as soon as possible. We're here to help!",
                createdAt: new Date().toISOString(),
                read: false,
              },
            ],
            status: "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await saveLiveChatConversation(conversation);
          return NextResponse.json({ conversation });
        }
      }
    }

    // Not logged in or user not found, use form data
    const conversation: LiveChatConversation = {
      id: uuid(),
      userId,
      userType: userTypeFromAuth || (userType as "mother" | "doctor"),
      userName: name,
      userPhone: phone,
      userEmail: email,
      sessionId,
      ipAddress: getClientIP(req) || undefined,
      messages: [
        {
          id: uuid(),
          conversationId: "",
          senderId: "admin",
          senderType: "admin",
          senderName: "Admin",
          content: "Hello! Please write your issue so that we can solve it as soon as possible. We're here to help!",
          createdAt: new Date().toISOString(),
          read: false,
        },
      ],
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update conversationId in the welcome message
    conversation.messages[0].conversationId = conversation.id;

    await saveLiveChatConversation(conversation);
    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error("Error creating conversation:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}

