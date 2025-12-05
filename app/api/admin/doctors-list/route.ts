import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listAllDoctors } from "@/lib/data";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doctors = await listAllDoctors();
  const safe = doctors.map(({ passwordHash, ...rest }) => rest);
  
  return NextResponse.json({ doctors: safe });
}

