import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDoctor, saveDoctor, getMother, saveMother } from "@/lib/data";

/**
 * Pause or unpause a user (doctor or mother)
 */
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, userType, pause } = await req.json();
  
  if (!userId || !userType || typeof pause !== "boolean") {
    return NextResponse.json(
      { error: "userId, userType, and pause (boolean) are required" },
      { status: 400 }
    );
  }

  try {
    if (userType === "doctor") {
      const doctor = await getDoctor(userId);
      if (!doctor) {
        return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
      }

      const updated = {
        ...doctor,
        status: pause ? ("paused" as const) : ("approved" as const),
        updatedAt: new Date().toISOString(),
      };

      await saveDoctor(updated);
      return NextResponse.json({ success: true, status: updated.status });
    } else if (userType === "mother") {
      const mother = await getMother(userId);
      if (!mother) {
        return NextResponse.json({ error: "Mother not found" }, { status: 404 });
      }

      const updated = {
        ...mother,
        status: pause ? ("paused" as const) : ("active" as const),
        updatedAt: new Date().toISOString(),
      };

      await saveMother(updated);
      return NextResponse.json({ success: true, status: updated.status });
    } else {
      return NextResponse.json(
        { error: "Invalid userType. Must be 'doctor' or 'mother'" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Pause user error:", error);
    return NextResponse.json(
      { error: "Failed to update user status" },
      { status: 500 }
    );
  }
}

