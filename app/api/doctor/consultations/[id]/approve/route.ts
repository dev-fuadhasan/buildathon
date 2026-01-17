import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getConsultation, saveConsultation, saveNotification } from "@/lib/data";
import { v4 as uuid } from "uuid";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const consultation = await getConsultation(id);

    if (!consultation) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    }

    if (consultation.doctorId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (consultation.status !== "pending") {
      return NextResponse.json(
        { error: "Consultation is not pending" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    consultation.status = "approved";
    consultation.respondedAt = now;
    consultation.updatedAt = now;

    await saveConsultation(consultation);

    // Create notification for mother
    const notificationId = uuid();
    const { getDoctor, getMother } = await import("@/lib/data");
    const doctor = await getDoctor(user.id);
    const mother = await getMother(consultation.motherId);
    
    if (mother) {
      await saveNotification({
        id: notificationId,
        motherId: consultation.motherId,
        type: "consultation_approved",
        title: "Consultation Approved",
        content: `Dr. ${doctor?.name || "Your doctor"} has approved your consultation request. You can now message them and share your medical details.`,
        read: false,
        createdAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      consultation,
      message: "Consultation approved successfully",
    });
  } catch (error: any) {
    console.error("Error approving consultation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to approve consultation" },
      { status: 500 }
    );
  }
}
