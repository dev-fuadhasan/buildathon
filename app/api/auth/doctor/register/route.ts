import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { hashPassword } from "@/lib/auth";
import { findDoctorByEmail, saveDoctor } from "@/lib/data";
import { copyObject, getJson as getR2Json } from "@/lib/r2Client";

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
    const doctorId = uuid();
    
    // If profilePicture is provided and contains a temp path, copy it to the doctor's folder
    let finalProfilePictureKey = profilePicture || "";
    if (profilePicture && profilePicture.includes("temp-")) {
      // Extract the filename from the temp path
      const parts = profilePicture.split("/");
      const filename = parts[parts.length - 1];
      // The filename already includes "profile-", so we just use it as-is
      finalProfilePictureKey = `doctors/${doctorId}/${filename}`;
      
      // Copy the file from temp location to final location
      try {
        await copyObject(profilePicture, finalProfilePictureKey);
        console.log(`[Doctor Register] Copied profile picture from ${profilePicture} to ${finalProfilePictureKey}`);
      } catch (err) {
        console.error("Failed to copy profile picture:", err);
        // If copy fails, try to use the temp path as fallback
        // The signed URL generation will handle it
        finalProfilePictureKey = profilePicture;
      }
    }
    
    const doctor = {
      id: doctorId,
      email,
      name,
      phone,
      specialty,
      bmdcNumber,
      clinicName,
      clinicAddress,
      profilePicture: finalProfilePictureKey, // Store the key
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
      console.log(`[Doctor Register] Successfully saved doctor: ${doctor.id}, email: ${doctor.email}, status: ${doctor.status}`);
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

