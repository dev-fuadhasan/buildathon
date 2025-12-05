import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { hashPassword } from "@/lib/auth";
import { findDoctorByEmail, saveDoctor } from "@/lib/data";

export async function POST(req: NextRequest) {
  const {
    email,
    password,
    name,
    phone,
    specialty,
    bmdcNumber,
    clinicName,
    clinicAddress,
    profilePicture,
    qualification,
    experience,
  } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  if (!name || !phone || !specialty || !bmdcNumber || !clinicName || !clinicAddress || !qualification || !experience) {
    return NextResponse.json(
      { error: "All required fields must be filled" },
      { status: 400 }
    );
  }

  const existing = await findDoctorByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const doctor = {
    id: uuid(),
    email,
    name,
    phone,
    specialty,
    bmdcNumber,
    clinicName,
    clinicAddress,
    profilePicture: profilePicture || "",
    qualification,
    experience,
    passwordHash: await hashPassword(password),
    status: "pending" as const,
    pendingVerification: false,
    createdAt: now,
    updatedAt: now,
  };

  await saveDoctor(doctor);
  return NextResponse.json({ status: "pending", doctorId: doctor.id });
}

