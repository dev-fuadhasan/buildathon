import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { v4 as uuid } from "uuid";
import { findMotherByEmail, findDoctorByEmail, savePasswordResetToken } from "@/lib/data";
import { PasswordResetEmail } from "@/components/EmailTemplate";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

export async function POST(req: NextRequest) {
  try {
    const { email, role } = await req.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    if (role !== "mother" && role !== "doctor") {
      return NextResponse.json(
        { error: "Invalid role. Must be 'mother' or 'doctor'" },
        { status: 400 }
      );
    }

    // Find user by email
    let user;
    if (role === "mother") {
      user = await findMotherByEmail(email);
    } else {
      user = await findDoctorByEmail(email);
    }

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (!user) {
      return NextResponse.json({
        message: "If an account exists with this email, a password reset link has been sent.",
      });
    }

    // Generate reset token
    const token = uuid();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Save token to R2
    await savePasswordResetToken({
      token,
      email: email.toLowerCase(),
      role,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      used: false,
    });

    // Generate reset link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    process.env.VERCEL_URL || 
                    process.env.NETLIFY_URL ||
                    "http://localhost:3000";
    
    const resetLink = `${baseUrl}/reset-password?token=${token}&role=${role}`;

    // Send email
    const fromEmail = process.env.RESEND_FROM_EMAIL || "MomsCare <onboarding@resend.dev>";
    const resend = getResend();
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "Reset Your MomsCare Password",
      react: PasswordResetEmail({
        resetLink,
        userName: (user as any).name || "User",
        expiresIn: "1 hour",
      }),
    });

    if (error) {
      console.error("Error sending password reset email:", error);
      return NextResponse.json(
        { error: "Failed to send password reset email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

