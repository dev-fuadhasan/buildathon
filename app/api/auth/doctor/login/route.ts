import { NextRequest, NextResponse } from "next/server";
import { signAuthToken, verifyPassword } from "@/lib/auth";
import { findDoctorByEmail } from "@/lib/data";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const doctor = await findDoctorByEmail(email);
  if (!doctor) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, doctor.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Allow login regardless of status, but include status info
  const token = signAuthToken({ id: doctor.id, email: doctor.email, role: "doctor" });
  const { passwordHash, ...safe } = doctor;
  
  // Include status and comment info
  return NextResponse.json({ 
    token, 
    doctor: safe,
    status: doctor.status,
    verificationComment: doctor.verificationComment,
    pendingVerification: doctor.pendingVerification,
  });
}

