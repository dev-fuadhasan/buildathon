import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { hashPassword } from "@/lib/auth";
import { findDoctorByEmail, saveDoctor, listAllDoctors, generateUniqueReferenceNumber } from "@/lib/data";
import { copyObject, getJson as getR2Json } from "@/lib/r2Client";
import { findMatchingHospitalName, getAllHospitalNames } from "@/lib/hospitalNameMatcher";

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
      role, // "doctor" | "others"
      hospitalClinicName, // New field
      specialty,
      bmdcNumber,
      clinicName, // Keep for backward compatibility
      clinicAddress,
      profilePicture,
      qualification,
      experience,
    } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // Validate role
    const validRole = role === "doctor" || role === "others";
    if (!validRole) {
      return NextResponse.json({ error: "Invalid role. Must be doctor or others" }, { status: 400 });
    }

    // Hospital/clinic name is required
    const finalHospitalClinicName = hospitalClinicName || clinicName;
    if (!finalHospitalClinicName) {
      return NextResponse.json({ error: "Hospital/Clinic name is required" }, { status: 400 });
    }

    // For doctors, all fields are required. For others, some fields are optional
    if (role === "doctor") {
      if (!name || !phone || !specialty || !bmdcNumber || !clinicAddress || !qualification || !experience) {
        return NextResponse.json(
          { error: "All required fields must be filled" },
          { status: 400 }
        );
      }
    } else {
      // Others: name, phone, and hospital/clinic name are required
      if (!name || !phone) {
        return NextResponse.json(
          { error: "Name and phone are required" },
          { status: 400 }
        );
      }
    }

    // Check for existing health worker
    const existing = await findDoctorByEmail(email);
    
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // For others: Check if hospital/clinic name matches existing ones
    let matchedHospitalName = finalHospitalClinicName;
    if (role === "others") {
      const existingHospitalNames = await getAllHospitalNames();
      const match = await findMatchingHospitalName(finalHospitalClinicName, existingHospitalNames);
      if (match) {
        matchedHospitalName = match; // Use the matched name for consistency
      }
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
    
    // Generate unique 8-digit reference number for doctors
    let referenceNumber: string | undefined;
    if (role === "doctor") {
      referenceNumber = await generateUniqueReferenceNumber();
    }
    
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
      role: role as "doctor" | "others",
      specialty: role === "doctor" ? specialty : undefined,
      bmdcNumber: role === "doctor" ? bmdcNumber : undefined,
      referenceNumber: role === "doctor" ? referenceNumber : undefined,
      hospitalClinicName: matchedHospitalName, // Normalized/matched name
      hospitalClinicNameOriginal: finalHospitalClinicName, // Original as entered
      clinicName: matchedHospitalName, // Keep for backward compatibility
      clinicAddress: role === "doctor" ? clinicAddress : undefined,
      profilePicture: finalProfilePictureKey, // Store the key
      qualification: role === "doctor" ? qualification : undefined,
      experience: role === "doctor" ? experience : undefined,
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

