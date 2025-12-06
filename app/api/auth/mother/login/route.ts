import { NextRequest, NextResponse } from "next/server";
import { signAuthToken, verifyPassword } from "@/lib/auth";
import { findMotherByEmail } from "@/lib/data";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const mother = await findMotherByEmail(email);
  if (!mother) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, mother.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Check if account is paused
  if (mother.status === "paused") {
    return NextResponse.json({ 
      error: "Your account has been paused by admin. Please contact admin for more information." 
    }, { status: 403 });
  }

  const token = signAuthToken({ id: mother.id, email: mother.email, role: "mother" });
  const { passwordHash, ...safe } = mother;

  return NextResponse.json({ token, mother: safe });
}

