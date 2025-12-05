import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { hashPassword } from "@/lib/auth";
import { findDoctorByEmail, saveDoctor } from "@/lib/data";

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (err) {
      console.error("Error parsing request body:", err);
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

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
    } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    if (!name || !phone || !specialty || !bmdcNumber || !clinicName || !clinicAddress || !qualification || !experience) {
      return NextResponse.json(
        { error: "All required fields must be filled" },
        { status: 400 }
      );
    }

    // Check for existing doctor
    // Note: findDoctorByEmail now returns null on error instead of throwing
    // This allows registration to proceed even if R2 check fails
    const existing = await findDoctorByEmail(email);
    
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Hash password
    let passwordHash;
    try {
      passwordHash = await hashPassword(password);
    } catch (err) {
      console.error("Error hashing password:", err);
      return NextResponse.json(
        { error: "Failed to process password" },
        { status: 500 }
      );
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
      passwordHash,
      status: "pending" as const,
      pendingVerification: false,
      createdAt: now,
      updatedAt: now,
    };

    // Save doctor
    try {
      await saveDoctor(doctor);
    } catch (err) {
      console.error("Error saving doctor:", err);
      return NextResponse.json(
        { error: "Failed to save registration. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "pending", doctorId: doctor.id });
  } catch (error: any) {
    console.error("Doctor registration error:", error);
    return NextResponse.json(
      { error: error.message || "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}

