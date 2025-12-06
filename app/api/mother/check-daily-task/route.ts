import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getMother, getJournalEntry, saveNotification, Notification } from "@/lib/data";
import { getCurrentDateInTimezone, getCurrentTimeInTimezone } from "@/lib/pregnancyTracker";
import { getClientIP, detectTimezoneFromIP } from "@/lib/timezoneDetector";
import { v4 as uuid } from "uuid";

/**
 * Checks if it's 6 PM and creates a daily task notification if needed
 */
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mother = await getMother(user.id);
    if (!mother) {
      return NextResponse.json({ error: "Mother not found" }, { status: 404 });
    }

    // Detect timezone from IP
    const ip = getClientIP(req);
    const timezone = await detectTimezoneFromIP(ip, mother.address);
    
    // Update timezone in profile if not set or different
    if (mother.timezone !== timezone) {
      const { saveMother } = await import("@/lib/data");
      await saveMother({
        ...mother,
        timezone,
        updatedAt: new Date().toISOString(),
      });
    }
    
    const today = getCurrentDateInTimezone(timezone);
    const { hour, minute } = getCurrentTimeInTimezone(timezone);

    // Check if it's 6 PM (18:00) - with 5 minute window
    if (hour !== 18 || minute > 5) {
      return NextResponse.json({
        message: "Not 6 PM yet",
        currentHour: hour,
        currentMinute: minute,
        timezone,
      });
    }

    // Check if today's journal entry already exists
    const todayEntry = await getJournalEntry(user.id, today);
    
    // Check if we already sent a notification today
    // (In a real system, you'd check notification history)
    // For now, we'll create the notification if entry doesn't exist

    if (!todayEntry) {
      // Create daily task notification
      const notification: Notification = {
        id: uuid(),
        motherId: user.id,
        type: "daily_task",
        title: "📝 Daily Journal Task",
        message: "It's time to write your daily journal! Share how your day went, what you ate, and how you're feeling. You can write in English, Bangla, or Banglish.",
        read: false,
        createdAt: new Date().toISOString(),
      };

      await saveNotification(notification);

      return NextResponse.json({
        success: true,
        notification,
        hasEntry: false,
      });
    }

    return NextResponse.json({
      success: true,
      hasEntry: true,
      message: "Journal entry already exists for today",
    });
  } catch (error: any) {
    console.error("Check daily task error:", error);
    return NextResponse.json(
      { error: "Failed to check daily task" },
      { status: 500 }
    );
  }
}

