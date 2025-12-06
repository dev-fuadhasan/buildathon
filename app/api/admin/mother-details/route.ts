import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getMother } from "@/lib/data";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const motherId = searchParams.get("id");
  
  if (!motherId) {
    return NextResponse.json({ error: "Mother ID required" }, { status: 400 });
  }

  const mother = await getMother(motherId);
  if (!mother) {
    return NextResponse.json({ error: "Mother not found" }, { status: 404 });
  }

  const { passwordHash, ...safe } = mother;
  return NextResponse.json({ profile: safe });
}

