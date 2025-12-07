import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { v4 as uuid } from "uuid";
import { findMotherByEmail, findDoctorByEmail, savePasswordResetToken } from "@/lib/data";
import { PasswordResetEmail } from "@/components/EmailTemplate";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not configured in environment variables");
    throw new Error("Email service is not configured. Please contact support.");
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

    // Check if user exists
    if (!user) {
      return NextResponse.json(
        { error: "This email is not registered in our system. Please enter a registered email address." },
        { status: 404 }
      );
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

    // Generate reset link with proper HTTPS
    // Try to get the base URL from various sources
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    if (!baseUrl) {
      // Try Netlify environment variables
      if (process.env.NETLIFY) {
        baseUrl = process.env.DEPLOY_PRIME_URL || process.env.URL;
      }
      // Try Vercel
      if (!baseUrl && process.env.VERCEL) {
        baseUrl = process.env.VERCEL_URL;
      }
      // Fallback to production URL
      if (!baseUrl) {
        baseUrl = process.env.NODE_ENV === "production" 
          ? "momscareai.netlify.app" 
          : "localhost:3000";
      }
    }
    
    // Remove protocol if present (we'll add https)
    baseUrl = baseUrl.replace(/^https?:\/\//, '');
    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // Always use HTTPS in production, HTTP only for localhost
    const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
    const resetLink = `${protocol}://${baseUrl}/reset-password?token=${token}&role=${role}`;
    
    console.log("Generated reset link:", resetLink);

    // Send email
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "MomsCare <onboarding@resend.dev>";
      const resend = getResend();
      
      console.log("Attempting to send password reset email to:", email);
      console.log("Using from email:", fromEmail);
      console.log("Reset link:", resetLink);
      
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
        console.error("Resend API error:", error);
        return NextResponse.json(
          { error: `Failed to send password reset email: ${error.message || "Please try again later."}` },
          { status: 500 }
        );
      }

      console.log("Password reset email sent successfully to:", email);
    } catch (emailError: any) {
      console.error("Error in email sending process:", emailError);
      return NextResponse.json(
        { error: emailError.message || "Failed to send password reset email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Password reset link has been sent to your email. Please wait up to 5 minutes for the email to arrive, then check your inbox (and spam folder). If you don't receive it after 5 minutes, you can request a new link.",
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

