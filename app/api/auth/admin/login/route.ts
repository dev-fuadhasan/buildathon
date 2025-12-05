import { NextRequest, NextResponse } from "next/server";
import { signAuthToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.warn("ADMIN_EMAIL or ADMIN_PASSWORD not set. Admin login will fail.");
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Admin credentials not configured" }, { status: 500 });
  }

  const emailMatch = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const passwordMatch = await bcrypt.compare(password, await bcrypt.hash(ADMIN_PASSWORD, 10));

  if (!emailMatch || !passwordMatch) {
    return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
  }

  const token = signAuthToken({ id: "admin", email: ADMIN_EMAIL, role: "admin" });
  return NextResponse.json({ token });
}

