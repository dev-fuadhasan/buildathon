import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getMother, saveMother } from "@/lib/data";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "mother") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const mother = await getMother(user.id);
  if (!mother) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { passwordHash, ...safe } = mother;
  return NextResponse.json({ profile: safe });
}

export async function PUT(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "mother") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const mother = await getMother(user.id);
  if (!mother) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();

    // Validate and prepare updated profile data
    // Ensure all fields are properly saved, including empty strings/null values
    const updated = {
      ...mother,
      // Basic info
      name: body.name !== undefined ? (body.name.trim() || null) : mother.name,
      age: body.age !== undefined ? (body.age || null) : mother.age,
      phone: body.phone !== undefined ? (body.phone.trim() || null) : mother.phone,
      address: body.address !== undefined ? (body.address.trim() || null) : mother.address,
      area: body.area !== undefined ? (body.area.trim() || null) : mother.area,
      
      // Health info
      bloodGroup: body.bloodGroup !== undefined ? (body.bloodGroup || null) : mother.bloodGroup,
      weeksPregnant: body.weeksPregnant !== undefined ? (body.weeksPregnant || null) : mother.weeksPregnant,
      daysPregnant: body.daysPregnant !== undefined ? (body.daysPregnant || null) : mother.daysPregnant,
      dueDate: body.dueDate !== undefined ? (body.dueDate || null) : mother.dueDate,
      timezone: body.timezone !== undefined ? (body.timezone || mother.timezone || "Asia/Dhaka") : mother.timezone,
      
      // Medical history
      conditions: body.conditions !== undefined ? (body.conditions.trim() || null) : mother.conditions,
      medications: body.medications !== undefined ? (body.medications.trim() || null) : mother.medications,
      allergies: body.allergies !== undefined ? (body.allergies.trim() || null) : mother.allergies,
      previousPregnancies: body.previousPregnancies !== undefined ? (body.previousPregnancies || null) : mother.previousPregnancies,
      
      // Emergency contact
      emergencyContact: body.emergencyContact !== undefined ? (body.emergencyContact.trim() || null) : mother.emergencyContact,
      emergencyPhone: body.emergencyPhone !== undefined ? (body.emergencyPhone.trim() || null) : mother.emergencyPhone,
      
      // Metadata
      updatedAt: new Date().toISOString(),
    };
    
    console.log(`[Profile Update] Saving profile for user ${user.id}`);
    console.log(`[Profile Update] Fields being updated:`, Object.keys(body).join(', '));

  try {
    await saveMother(updated);
    const { passwordHash, ...safe } = updated;
    console.log(`[Profile Update] ✅ Profile saved successfully for user ${user.id}`);
    return NextResponse.json({ profile: safe });
  } catch (error: any) {
    console.error(`[Profile Update] ❌ Failed to save profile for user ${user.id}:`, error);
    console.error(`[Profile Update] Error details:`, {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: error.message || "Failed to save profile. Please try again." },
      { status: 500 }
    );
  }
}

