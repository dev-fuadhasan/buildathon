import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { 
  saveConsultation, 
  listMotherConsultations, 
  findConsultationByReference,
  findDoctorByReference,
  saveNotification
} from "@/lib/data";
import { v4 as uuid } from "uuid";

// GET: List all consultations for the mother
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const consultations = await listMotherConsultations(user.id);
    
    // Enrich with doctor info
    const { listAllDoctors } = await import("@/lib/data");
    const allDoctors = await listAllDoctors();
    
    const enriched = consultations.map(consultation => {
      const doctor = allDoctors.find(d => d.id === consultation.doctorId);
      return {
        ...consultation,
        doctor: doctor ? {
          name: doctor.name,
          email: doctor.email,
          specialty: doctor.specialty,
          referenceNumber: doctor.referenceNumber,
        } : null,
      };
    });

    return NextResponse.json({ consultations: enriched });
  } catch (error: any) {
    console.error("Error listing consultations:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list consultations" },
      { status: 500 }
    );
  }
}

// POST: Request a new consultation
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { referenceNumber } = body;

    if (!referenceNumber || typeof referenceNumber !== "string") {
      return NextResponse.json(
        { error: "Reference number is required" },
        { status: 400 }
      );
    }

    // Validate reference number format (8 digits)
    const refNum = referenceNumber.trim();
    if (!/^\d{8}$/.test(refNum)) {
      return NextResponse.json(
        { error: "Reference number must be 8 digits" },
        { status: 400 }
      );
    }

    // Check if consultation already exists
    const existing = await findConsultationByReference(refNum, user.id);
    if (existing) {
      return NextResponse.json(
        { error: "Consultation request already exists for this doctor" },
        { status: 400 }
      );
    }

    // Find doctor by reference number
    const doctor = await findDoctorByReference(refNum);
    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor with this reference number not found or not approved" },
        { status: 404 }
      );
    }

    // Create consultation
    const consultationId = uuid();
    const now = new Date().toISOString();
    
    const consultation = {
      id: consultationId,
      motherId: user.id,
      doctorId: doctor.id,
      doctorReferenceNumber: refNum,
      status: "pending" as const,
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await saveConsultation(consultation);

    // Create notification for doctor
    const notificationId = uuid();
    const { getMother } = await import("@/lib/data");
    const mother = await getMother(user.id);
    
    await saveNotification({
      id: notificationId,
      motherId: doctor.id, // Store in doctor's notifications (we'll need to handle this differently)
      type: "consultation_request",
      title: "New Consultation Request",
      content: `${mother?.name || mother?.email || "A mother"} has requested consultation with you. Reference: ${refNum}`,
      read: false,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      consultation,
      message: "Consultation request sent successfully",
    });
  } catch (error: any) {
    console.error("Error creating consultation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create consultation" },
      { status: 500 }
    );
  }
}
