import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getConsultation, ConsultationMessage } from "@/lib/data";
import { deleteObject, listObjects } from "@/lib/r2Client";

// DELETE: Remove a consultation (for both doctor and patient)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "mother" && user.role !== "doctor")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: consultationId } = await params;
    const consultation = await getConsultation(consultationId);

    if (!consultation) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    }

    // Check if user is authorized to delete this consultation
    const isAuthorized =
      (user.role === "mother" && consultation.motherId === user.id) ||
      (user.role === "doctor" && consultation.doctorId === user.id);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "You are not authorized to delete this consultation" },
        { status: 403 }
      );
    }

    // Delete the consultation and all its messages
    try {
      // Delete consultation file
      await deleteObject(`consultations/${consultationId}.json`);
      
      // Delete all messages for this consultation
      // We'll try to delete message files but won't fail if they don't exist
      try {
        const messageObjects = await listObjects(`consultations/${consultationId}/messages/`);
        if (messageObjects && messageObjects.length > 0) {
          for (const obj of messageObjects) {
            if (obj.Key) {
              try {
                await deleteObject(obj.Key);
              } catch (err) {
                console.error(`Failed to delete message ${obj.Key}:`, err);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error deleting messages:", err);
      }

      console.log(`[Consultation] Deleted consultation ${consultationId} by user ${user.id} (${user.role})`);
      
      return NextResponse.json({
        success: true,
        message: "Consultation removed successfully",
      });
    } catch (err) {
      console.error("Error deleting consultation:", err);
      return NextResponse.json(
        { error: "Failed to delete consultation" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in DELETE consultation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete consultation" },
      { status: 500 }
    );
  }
}
