import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getMother, listJournalEntries, saveNotification, Notification } from "@/lib/data";
import { generateJournalRecommendation, shouldGenerateRecommendation } from "@/lib/journalAI";
import { detectTimezone, getCurrentDateInTimezone, getCurrentTimeInTimezone } from "@/lib/pregnancyTracker";
import { v4 as uuid } from "uuid";

/**
 * This endpoint can be called periodically (via cron job or scheduled task)
 * to generate and send recommendations to mothers
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

    const timezone = mother.timezone || detectTimezone(mother.address);
    const { hour } = getCurrentTimeInTimezone(timezone);
    
    // Determine time of day
    let timeOfDay: "morning" | "evening" | null = null;
    if (hour >= 7 && hour <= 9) {
      timeOfDay = "morning";
    } else if (hour >= 19 && hour <= 21) {
      timeOfDay = "evening";
    }

    if (!timeOfDay) {
      return NextResponse.json({
        message: "Not the right time for recommendations",
        currentHour: hour,
      });
    }

    // Get journal entries
    const journalEntries = await listJournalEntries(user.id);
    
    // Generate recommendation
    const recommendation = await generateJournalRecommendation(
      mother,
      journalEntries,
      timeOfDay
    );

    // Create notification
    const notification: Notification = {
      id: uuid(),
      motherId: user.id,
      type: timeOfDay === "morning" ? "morning_recommendation" : "evening_recommendation",
      title: timeOfDay === "morning" ? "🌅 Morning Recommendation" : "🌙 Evening Recommendation",
      message: recommendation,
      read: false,
      createdAt: new Date().toISOString(),
    };

    await saveNotification(notification);

    return NextResponse.json({
      success: true,
      notification,
      timeOfDay,
    });
  } catch (error: any) {
    console.error("Generate recommendations error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}

