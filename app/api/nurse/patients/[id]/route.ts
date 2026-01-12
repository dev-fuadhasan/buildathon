import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getPatient, savePatient, deletePatient, PatientData } from "@/lib/data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { getDoctor } = await import("@/lib/data");
    const doctor = await getDoctor(user.id);
    if (!doctor || !doctor.hospitalClinicName) {
      return NextResponse.json({ error: "Hospital/Clinic name not found" }, { status: 400 });
    }

    if (doctor.role === "doctor") {
      return NextResponse.json({ error: "Only health workers can access patient data" }, { status: 403 });
    }

    const patient = await getPatient(doctor.hospitalClinicName, id);
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Get signed URLs for files
    const { signedUrl } = await import("@/lib/r2Client");
    const prescriptions = await Promise.all(
      (patient.prescriptions || []).map(async (file) => ({
        ...file,
        url: await signedUrl(file.key),
      }))
    );
    const reports = await Promise.all(
      (patient.reports || []).map(async (file) => ({
        ...file,
        url: await signedUrl(file.key),
      }))
    );
    const documents = await Promise.all(
      (patient.documents || []).map(async (file) => ({
        ...file,
        url: await signedUrl(file.key),
      }))
    );

    return NextResponse.json({
      patient: {
        ...patient,
        prescriptions,
        reports,
        documents,
      },
    });
  } catch (error: any) {
    console.error("Error loading patient:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load patient" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { getDoctor } = await import("@/lib/data");
    const doctor = await getDoctor(user.id);
    if (!doctor || !doctor.hospitalClinicName) {
      return NextResponse.json({ error: "Hospital/Clinic name not found" }, { status: 400 });
    }

    if (doctor.role === "doctor") {
      return NextResponse.json({ error: "Only health workers can edit patients" }, { status: 403 });
    }

    const patient = await getPatient(doctor.hospitalClinicName, id);
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const updated: PatientData = {
      ...patient,
      name: body.name ?? patient.name,
      age: body.age ?? patient.age,
      phone: body.phone ?? patient.phone,
      email: body.email ?? patient.email,
      address: body.address ?? patient.address,
      bloodGroup: body.bloodGroup ?? patient.bloodGroup,
      medicalHistory: body.medicalHistory ?? patient.medicalHistory,
      allergies: body.allergies ?? patient.allergies,
      currentMedications: body.currentMedications ?? patient.currentMedications,
      emergencyContact: body.emergencyContact ?? patient.emergencyContact,
      emergencyPhone: body.emergencyPhone ?? patient.emergencyPhone,
      notes: body.notes ?? patient.notes,
      updatedBy: user.id,
      updatedByName: doctor.name,
      updatedAt: new Date().toISOString(),
    };

    await savePatient(updated);

    // Trigger priority list update
    try {
      await fetch(`${req.nextUrl.origin}/api/nurse/update-priority`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalClinicName: doctor.hospitalClinicName }),
      });
    } catch (err) {
      console.error("Failed to trigger priority update:", err);
    }

    return NextResponse.json({ patient: updated });
  } catch (error: any) {
    console.error("Error updating patient:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update patient" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { getDoctor } = await import("@/lib/data");
    const doctor = await getDoctor(user.id);
    if (!doctor || !doctor.hospitalClinicName) {
      return NextResponse.json({ error: "Hospital/Clinic name not found" }, { status: 400 });
    }

    if (doctor.role === "doctor") {
      return NextResponse.json({ error: "Only health workers can delete patients" }, { status: 403 });
    }

    await deletePatient(doctor.hospitalClinicName, id);

    // Trigger priority list update
    try {
      await fetch(`${req.nextUrl.origin}/api/nurse/update-priority`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalClinicName: doctor.hospitalClinicName }),
      });
    } catch (err) {
      console.error("Failed to trigger priority update:", err);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting patient:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete patient" },
      { status: 500 }
    );
  }
}

