import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDoctor } from "@/lib/data";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get("id");
  
  if (!doctorId) {
    return NextResponse.json({ error: "Doctor ID required" }, { status: 400 });
  }

  const doctor = await getDoctor(doctorId);
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const { passwordHash, ...safe } = doctor;
  return NextResponse.json({ doctor: safe });
}

