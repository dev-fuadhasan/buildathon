import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { updatePregnancyProgress } from "@/lib/pregnancyTracker";

/**
 * Updates pregnancy progress (auto-increments days)
 * Should be called when mother dashboard loads
 */
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await updatePregnancyProgress(user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update progress error:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}

