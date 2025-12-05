import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDoctor, saveDoctor } from "@/lib/data";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doctor = await getDoctor(user.id);
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const { passwordHash, ...safe } = doctor;
  return NextResponse.json({ profile: safe });
}

export async function PUT(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doctor = await getDoctor(user.id);
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const body = await req.json();

  // When doctor edits profile, it needs re-verification
  const updated = {
    ...doctor,
    name: body.name ?? doctor.name,
    phone: body.phone ?? doctor.phone,
    specialty: body.specialty ?? doctor.specialty,
    bmdcNumber: body.bmdcNumber ?? doctor.bmdcNumber,
    clinicName: body.clinicName ?? doctor.clinicName,
    clinicAddress: body.clinicAddress ?? doctor.clinicAddress,
    profilePicture: body.profilePicture ?? doctor.profilePicture,
    qualification: body.qualification ?? doctor.qualification,
    experience: body.experience ?? doctor.experience,
    // If profile is edited and was approved, set to pending for re-verification
    status: doctor.status === "approved" ? ("pending" as const) : doctor.status,
    pendingVerification: doctor.status === "approved" ? true : doctor.pendingVerification,
    verificationComment: doctor.status === "approved" ? undefined : doctor.verificationComment,
    updatedAt: new Date().toISOString(),
  };

  await saveDoctor(updated);
  const { passwordHash, ...safe } = updated;
  return NextResponse.json({ 
    profile: safe,
    message: doctor.status === "approved" 
      ? "Profile updated. Waiting for admin verification." 
      : "Profile updated successfully."
  });
}

