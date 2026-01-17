import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { hashPassword, signAuthToken } from "@/lib/auth";
import { findMotherByEmail, saveMother } from "@/lib/data";

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const existing = await findMotherByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const mother = {
    id: uuid(),
    email,
    name: name || "",
    passwordHash: await hashPassword(password),
    createdAt: now,
    updatedAt: now,
    status: 'active' as const,
    onboardingComplete: false, // New users need onboarding
  };

  await saveMother(mother);
  const token = signAuthToken({ id: mother.id, email: mother.email, role: "mother" });

  const { passwordHash, ...safe } = mother;
  return NextResponse.json({ token, mother: safe });
}

