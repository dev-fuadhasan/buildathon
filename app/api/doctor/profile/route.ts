import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, signAuthToken } from "@/lib/auth";
import { getDoctor, saveDoctor, findDoctorByEmail } from "@/lib/data";
import { signedUrl } from "@/lib/r2Client";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
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
  const user = await getUserFromRequest(req);
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

  // Track changes by comparing old and new values
  const changes: Array<{ field: string; oldValue: string | undefined; newValue: string | undefined }> = [];
  const fieldsToCheck = [
    { key: "email", old: doctor.email, new: emailChanged ? newEmail : doctor.email },
    { key: "name", old: doctor.name, new: body.name },
    { key: "phone", old: doctor.phone, new: body.phone },
    { key: "specialty", old: doctor.specialty, new: body.specialty },
    { key: "bmdcNumber", old: doctor.bmdcNumber, new: body.bmdcNumber },
    { key: "clinicName", old: doctor.clinicName || doctor.hospitalClinicName, new: body.clinicName || body.hospitalClinicName },
    { key: "clinicAddress", old: doctor.clinicAddress, new: body.clinicAddress },
    { key: "qualification", old: doctor.qualification, new: body.qualification },
    { key: "experience", old: doctor.experience, new: body.experience },
  ];

  fieldsToCheck.forEach(({ key, old, new: newVal }) => {
    const oldStr = old?.toString().trim() || "";
    const newStr = newVal?.toString().trim() || "";
    if (oldStr !== newStr) {
      changes.push({
        field: key,
        oldValue: old || undefined,
        newValue: newVal || undefined,
      });
    }
  });

  // Store previous values before updating (only if there are actual changes)
  const previousValues = changes.length > 0 ? {
    email: doctor.email,
    name: doctor.name,
    phone: doctor.phone,
    specialty: doctor.specialty,
    bmdcNumber: doctor.bmdcNumber,
    clinicName: doctor.clinicName,
    clinicAddress: doctor.clinicAddress,
    qualification: doctor.qualification,
    experience: doctor.experience,
    profilePicture: doctor.profilePicture,
  } : doctor.previousValues;

  // When doctor edits profile, it needs re-verification
  const updated = {
    ...doctor,
    email: emailChanged ? newEmail : doctor.email,
    name: body.name ?? doctor.name,
    phone: body.phone ?? doctor.phone,
    specialty: body.specialty ?? doctor.specialty,
    bmdcNumber: body.bmdcNumber ?? doctor.bmdcNumber,
    clinicName: body.clinicName ?? body.hospitalClinicName ?? doctor.clinicName ?? doctor.hospitalClinicName,
    hospitalClinicName: body.hospitalClinicName ?? body.clinicName ?? doctor.hospitalClinicName ?? doctor.clinicName,
    clinicAddress: body.clinicAddress ?? doctor.clinicAddress,
    profilePicture: body.profilePicture ?? doctor.profilePicture,
    qualification: body.qualification ?? doctor.qualification,
    experience: body.experience ?? doctor.experience,
    // If profile is edited and was approved, set to pending for re-verification
    status: doctor.status === "approved" ? ("pending" as const) : doctor.status,
    pendingVerification: doctor.status === "approved" ? true : doctor.pendingVerification,
    verificationComment: doctor.status === "approved" ? undefined : doctor.verificationComment,
    previousValues: previousValues, // Store previous values
    changes: changes.length > 0 ? changes : undefined, // Store changes
    updatedAt: new Date().toISOString(),
  };

  await saveDoctor(updated);
  const { passwordHash, ...safe } = updated;
  
  // Always logout after profile edit to ensure they wait for admin approval
  // This prevents doctors from continuing to use the system after making changes
  
  return NextResponse.json({ 
    profile: safe,
    requiresLogout: true, // Always require logout after profile edit
    message: emailChanged
      ? "Profile updated. You have been logged out. Please use your new email to log in after admin approval."
      : doctor.status === "approved"
      ? "Profile updated. You have been logged out. Please wait for admin verification before logging in again."
      : "Profile updated. You have been logged out. Please wait for admin verification before logging in again."
  });
}

