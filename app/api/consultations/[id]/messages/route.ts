import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { 
  getConsultation, 
  saveConsultationMessage, 
  listConsultationMessages,
  markConsultationMessagesAsRead,
  saveNotification
} from "@/lib/data";
import { v4 as uuid } from "uuid";

// GET: List messages for a consultation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const consultation = await getConsultation(id);

    if (!consultation) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    }

    // Verify user has access
    if (user.role === "mother" && consultation.motherId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (user.role === "doctor" && consultation.doctorId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const messages = await listConsultationMessages(id);
    
    // Mark messages as read
    await markConsultationMessagesAsRead(id, user.id, user.role as "mother" | "doctor");

    // Sort by creation time
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("Error listing messages:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list messages" },
      { status: 500 }
    );
  }
}

// POST: Send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const consultation = await getConsultation(id);

    if (!consultation) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    }

    // Verify user has access and consultation is approved
    if (consultation.status !== "approved") {
      return NextResponse.json(
        { error: "Consultation must be approved before messaging" },
        { status: 400 }
      );
    }

    if (user.role === "mother" && consultation.motherId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (user.role === "doctor" && consultation.doctorId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const messageId = uuid();
    const now = new Date().toISOString();

    const consultationMessage = {
      id: messageId,
      consultationId: id,
      senderId: user.id,
      senderRole: user.role as "mother" | "doctor",
      message: message.trim(),
      createdAt: now,
      read: false,
    };

    await saveConsultationMessage(consultationMessage);

    // Create notification for the other party
    const notificationId = uuid();
    const recipientId = user.role === "mother" ? consultation.doctorId : consultation.motherId;
    const { getDoctor, getMother } = await import("@/lib/data");
    
    let senderName = "";
    if (user.role === "mother") {
      const mother = await getMother(user.id);
      senderName = mother?.name || mother?.email || "A mother";
    } else {
      const doctor = await getDoctor(user.id);
      senderName = `Dr. ${doctor?.name || "A doctor"}`;
    }

    await saveNotification({
      id: notificationId,
      motherId: recipientId,
      type: "consultation_message",
      title: "New Message",
      content: `${senderName} sent you a message in your consultation.`,
      read: false,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      message: consultationMessage,
    });
  } catch (error: any) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
