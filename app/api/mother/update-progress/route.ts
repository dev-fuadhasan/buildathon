import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { updatePregnancyProgress } from "@/lib/pregnancyTracker";
import { getClientIP, detectTimezoneFromIP } from "@/lib/timezoneDetector";
import { getMother } from "@/lib/data";

/**
 * Updates pregnancy progress (auto-increments days)
 * Should be called when mother dashboard loads
 * Only increments at 12:00 AM local time
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Detect timezone from IP
    const ip = getClientIP(req);
    const mother = await getMother(user.id);
    const timezone = await detectTimezoneFromIP(ip, mother?.address);
    
    // Update timezone in profile if not set or different
    if (mother && mother.timezone !== timezone) {
      const { saveMother } = await import("@/lib/data");
      await saveMother({
        ...mother,
        timezone,
        updatedAt: new Date().toISOString(),
      });
    }

    await updatePregnancyProgress(user.id, timezone);

    return NextResponse.json({ success: true, timezone });
  } catch (error: any) {
    console.error("Update progress error:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}

