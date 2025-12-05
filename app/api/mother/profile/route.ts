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
    weeksPregnant: body.weeksPregnant ?? mother.weeksPregnant,
    dueDate: body.dueDate ?? mother.dueDate,
    conditions: body.conditions ?? mother.conditions,
    medications: body.medications ?? mother.medications,
    updatedAt: new Date().toISOString(),
  };

  await saveMother(updated);
  const { passwordHash, ...safe } = updated;
  return NextResponse.json({ profile: safe });
}

