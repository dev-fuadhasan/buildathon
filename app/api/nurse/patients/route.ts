import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listPatients, savePatient, PatientData } from "@/lib/data";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get doctor profile to get hospital/clinic name
    const { getDoctor } = await import("@/lib/data");
    const doctor = await getDoctor(user.id);
    if (!doctor || !doctor.hospitalClinicName) {
      return NextResponse.json({ error: "Hospital/Clinic name not found" }, { status: 400 });
    }

    // Only nurses/others can access this endpoint
    if (doctor.role === "doctor") {
      return NextResponse.json({ error: "Only nurses and others can access patient data" }, { status: 403 });
    }

    const patients = await listPatients(doctor.hospitalClinicName);
    
    // Get signed URLs for patient files
    const { signedUrl } = await import("@/lib/r2Client");
    const patientsWithUrls = await Promise.all(
      patients.map(async (patient) => {
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
        return {
          ...patient,
          prescriptions,
          reports,
          documents,
        };
      })
    );

    return NextResponse.json({ patients: patientsWithUrls });
  } catch (error: any) {
    console.error("Error loading patients:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load patients" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
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
      return NextResponse.json({ error: "Only nurses and others can add patients" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const patient: PatientData = {
      id: uuid(),
      hospitalClinicName: doctor.hospitalClinicName,
      name: body.name,
      age: body.age,
      phone: body.phone,
      email: body.email,
      address: body.address,
      bloodGroup: body.bloodGroup,
      medicalHistory: body.medicalHistory,
      allergies: body.allergies,
      currentMedications: body.currentMedications,
      emergencyContact: body.emergencyContact,
      emergencyPhone: body.emergencyPhone,
      notes: body.notes,
      prescriptions: [],
      reports: [],
      documents: [],
      createdBy: user.id,
      createdByName: doctor.name,
      createdAt: now,
      updatedAt: now,
    };

    await savePatient(patient);

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

    return NextResponse.json({ patient });
  } catch (error: any) {
    console.error("Error creating patient:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create patient" },
      { status: 500 }
    );
  }
}

