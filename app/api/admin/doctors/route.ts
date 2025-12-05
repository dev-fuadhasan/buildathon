import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDoctor, listAllDoctors, saveDoctor } from "@/lib/data";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const doctors = await listAllDoctors();
    console.log(`[Admin] Found ${doctors.length} total doctors`);
    
    const pending = doctors
      .filter((d) => d.status === "pending")
      .map(({ passwordHash, ...rest }) => rest);
    
    console.log(`[Admin] Found ${pending.length} pending doctors`);
    
    return NextResponse.json({ pending });
  } catch (error: any) {
    console.error("[Admin] Error fetching pending doctors:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending doctors", message: error.message },
      { status: 500 }
    );
  }
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

