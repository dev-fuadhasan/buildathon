import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import {
  getPasswordResetToken,
  markTokenAsUsed,
  findMotherByEmail,
  findDoctorByEmail,
  getMother,
  getDoctor,
  saveMother,
  saveDoctor,
} from "@/lib/data";

export async function POST(req: NextRequest) {
  try {
    const { token, password, role } = await req.json();

    if (!token || !password || !role) {
      return NextResponse.json(
        { error: "Token, password, and role are required" },
        { status: 400 }
      );
    }

    if (role !== "mother" && role !== "doctor") {
      return NextResponse.json(
        { error: "Invalid role. Must be 'mother' or 'doctor'" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Get token from R2
    const tokenData = await getPasswordResetToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Check if token is used
    if (tokenData.used) {
      return NextResponse.json(
        { error: "This reset link has already been used. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expiresAt);
    if (now > expiresAt) {
      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if role matches
    if (tokenData.role !== role) {
      return NextResponse.json(
        { error: "Invalid token for this user type" },
        { status: 400 }
      );
    }

    // Get user
    if (role === "mother") {
      const mother = await findMotherByEmail(tokenData.email);
      if (!mother) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      const user = await getMother(mother.id);
      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      // Hash new password
      const passwordHash = await hashPassword(password);

      // Update user password
      await saveMother({
        ...user,
        passwordHash,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const doctor = await findDoctorByEmail(tokenData.email);
      if (!doctor) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      const user = await getDoctor(doctor.id);
      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      // Hash new password
      const passwordHash = await hashPassword(password);

      // Update user password
      await saveDoctor({
        ...user,
        passwordHash,
        updatedAt: new Date().toISOString(),
      });
    }

    // Mark token as used
    await markTokenAsUsed(token);

    return NextResponse.json({
      message: "Password has been reset successfully. You can now login with your new password.",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

