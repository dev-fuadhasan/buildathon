import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listAllMothers } from "@/lib/data";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mothers = await listAllMothers();
  const safe = mothers.map(({ passwordHash, ...rest }) => rest);
  
  return NextResponse.json({ mothers: safe });
}

