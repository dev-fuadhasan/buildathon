import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { updatePregnancyProgress } from "@/lib/pregnancyTracker";
import { getClientIP, detectTimezoneFromIP } from "@/lib/timezoneDetector";
import { getMother } from "@/lib/data";

/**
 * Updates pregnancy progress (auto-increments days)
 * Should be called every 5 minutes (like recommendation system)
 * Only increments at 12:00 AM (midnight) local time in mother's timezone
 * This endpoint checks if it's midnight and updates the pregnancy day if needed
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
    if (!mother) {
      return NextResponse.json({ error: "Mother not found" }, { status: 404 });
    }
    
    const timezone = await detectTimezoneFromIP(ip, mother.address);
    
    console.log(`[Update Progress] Mother: ${user.id}, IP: ${ip}, Detected Timezone: ${timezone}, Mother Address: ${mother.address}`);
    
    // Update timezone in profile if not set or different
    if (mother.timezone !== timezone) {
      const { saveMother } = await import("@/lib/data");
      await saveMother({
        ...mother,
        timezone,
        updatedAt: new Date().toISOString(),
      });
      console.log(`[Update Progress] Updated timezone from ${mother.timezone} to ${timezone}`);
    }

    // This will check if it's midnight and update if needed
    await updatePregnancyProgress(user.id, timezone);

    return NextResponse.json({ 
      success: true, 
      timezone,
      message: "Pregnancy progress check completed"
    });
  } catch (error: any) {
    console.error("Update progress error:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}
