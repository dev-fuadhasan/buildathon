import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getMother, saveMother } from "@/lib/data";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "mother") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const mother = await getMother(user.id);
  if (!mother) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { passwordHash, ...safe } = mother;
  return NextResponse.json({ profile: safe });
}

export async function PUT(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "mother") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const mother = await getMother(user.id);
  if (!mother) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();

    const updated = {
      ...mother,
      name: body.name ?? mother.name,
      age: body.age ?? mother.age,
      phone: body.phone ?? mother.phone,
      address: body.address ?? mother.address,
      bloodGroup: body.bloodGroup ?? mother.bloodGroup,
      weeksPregnant: body.weeksPregnant ?? mother.weeksPregnant,
      daysPregnant: body.daysPregnant ?? mother.daysPregnant,
      dueDate: body.dueDate ?? mother.dueDate,
      timezone: body.timezone ?? mother.timezone,
      conditions: body.conditions ?? mother.conditions,
      medications: body.medications ?? mother.medications,
      emergencyContact: body.emergencyContact ?? mother.emergencyContact,
      emergencyPhone: body.emergencyPhone ?? mother.emergencyPhone,
      previousPregnancies: body.previousPregnancies ?? mother.previousPregnancies,
      allergies: body.allergies ?? mother.allergies,
      updatedAt: new Date().toISOString(),
    };

  await saveMother(updated);
  const { passwordHash, ...safe } = updated;
  return NextResponse.json({ profile: safe });
}

