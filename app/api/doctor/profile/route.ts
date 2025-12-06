import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, signAuthToken } from "@/lib/auth";
import { getDoctor, saveDoctor, findDoctorByEmail } from "@/lib/data";
import { signedUrl } from "@/lib/r2Client";

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
  
  // Generate fresh signed URL for profile picture if it exists
  if (safe.profilePicture && !safe.profilePicture.startsWith("http")) {
    // It's a key, generate fresh signed URL
    try {
      safe.profilePicture = await signedUrl(safe.profilePicture, 86400); // 24 hours
    } catch (err) {
      console.error("Failed to generate signed URL for profile picture:", err);
      safe.profilePicture = undefined;
    }
  }
  
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

  // Check if email is being changed
  const newEmail = body.email?.trim().toLowerCase();
  const emailChanged = newEmail && newEmail !== doctor.email.toLowerCase();

  if (emailChanged) {
    // Check if new email is already taken by another doctor
    const existingDoctor = await findDoctorByEmail(newEmail);
    if (existingDoctor && existingDoctor.id !== doctor.id) {
      return NextResponse.json(
        { error: "Email is already registered by another doctor" },
        { status: 409 }
      );
    }
  }

  // When doctor edits profile, it needs re-verification
  const updated = {
    ...doctor,
    email: emailChanged ? newEmail : doctor.email,
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
  
  // Generate new token with updated email if email was changed
  let newToken: string | undefined;
  if (emailChanged) {
    newToken = signAuthToken({ 
      id: updated.id, 
      email: updated.email, 
      role: "doctor" 
    });
  }
  
  return NextResponse.json({ 
    profile: safe,
    token: newToken, // Return new token if email was changed
    message: emailChanged
      ? "Email updated successfully. Your login credentials have been updated. Please use your new email to log in next time."
      : doctor.status === "approved" 
      ? "Profile updated. Waiting for admin verification." 
      : "Profile updated successfully."
  });
}

