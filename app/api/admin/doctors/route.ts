import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDoctor, listAllDoctors, saveDoctor } from "@/lib/data";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const doctors = await listAllDoctors();
  const pending = doctors
    .filter((d) => d.status === "pending")
    .map(({ passwordHash, ...rest }) => rest);
  return NextResponse.json({ pending });
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { doctorId, action, comment } = await req.json();
  if (!doctorId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "doctorId and action required" }, { status: 400 });
  }
  const doctor = await getDoctor(doctorId);
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  const updated = {
    ...doctor,
    status: action === "approve" ? ("approved" as const) : ("rejected" as const),
    verificationComment: comment || undefined,
    pendingVerification: false,
    updatedAt: new Date().toISOString(),
  };
  await saveDoctor(updated);
  return NextResponse.json({ doctorId, status: updated.status });
}

