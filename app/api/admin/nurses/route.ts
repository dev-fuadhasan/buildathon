import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listAllDoctors } from "@/lib/data";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allDoctors = await listAllDoctors();
    
    // Filter only nurses and others (not doctors)
    const nurses = allDoctors.filter((d) => d.role === "nurse" || d.role === "others");

    return NextResponse.json({ nurses });
  } catch (error: any) {
    console.error("Error loading nurses:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load nurses" },
      { status: 500 }
    );
  }
}

