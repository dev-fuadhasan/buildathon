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

  // Only allow approved doctors to login (not pending, rejected, or paused)
  if (doctor.status !== "approved") {
    const statusMessage = doctor.status === "pending" 
      ? "Your account is pending admin approval. Please wait for approval before logging in."
      : doctor.status === "rejected"
      ? `Your account has been rejected. ${doctor.verificationComment ? `Reason: ${doctor.verificationComment}` : ""}`
      : doctor.status === "paused"
      ? "Your account has been paused by admin. Please contact admin for more information."
      : "Your account is not approved. Please contact admin.";
    
    return NextResponse.json({ 
      error: statusMessage,
      status: doctor.status,
      verificationComment: doctor.verificationComment,
    }, { status: 403 });
  }

  // Only allow doctors to login - health workers (others) are not supported
  if (doctor.role !== "doctor") {
    return NextResponse.json({ 
      error: "Only doctors can access this login. Health workers are not supported."
    }, { status: 403 });
  }

  const token = signAuthToken({ id: doctor.id, email: doctor.email, role: "doctor" });
  const { passwordHash, ...safe } = doctor;
  
  return NextResponse.json({ 
    token, 
    doctor: safe,
    status: doctor.status,
    role: doctor.role,
    dashboardRoute: "/doctor/dashboard",
  });
}

