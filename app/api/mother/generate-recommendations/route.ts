import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getMother, listJournalEntries, saveNotification, Notification } from "@/lib/data";
import { generateJournalRecommendation, shouldGenerateRecommendation } from "@/lib/journalAI";
import { getCurrentDateInTimezone, getCurrentTimeInTimezone } from "@/lib/pregnancyTracker";
import { getClientIP, detectTimezoneFromIP } from "@/lib/timezoneDetector";
import { v4 as uuid } from "uuid";

/**
 * This endpoint can be called periodically (via cron job or scheduled task)
 * to generate and send recommendations to mothers
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
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
    
    const { hour, minute } = getCurrentTimeInTimezone(timezone);
    
    // Determine time of day - exactly at 8 AM or 8 PM (with 5 minute window)
    let timeOfDay: "morning" | "evening" | null = null;
    if (hour === 8 && minute <= 5) {
      timeOfDay = "morning";
    } else if (hour === 20 && minute <= 5) {
      timeOfDay = "evening";
    }

    if (!timeOfDay) {
      return NextResponse.json({
        message: "Not the right time for recommendations",
        currentHour: hour,
        currentMinute: minute,
        timezone,
      });
    }
    
    // Check if we already generated recommendation for this time today
    const today = getCurrentDateInTimezone(timezone);
    const lastNotificationKey = timeOfDay === "morning" ? "lastMorningAdviceDate" : "lastNightAdviceDate";
    if (mother[lastNotificationKey] === today) {
      return NextResponse.json({
        message: "Recommendation already generated for this time today",
        timeOfDay,
      });
    }

    // Get journal entries
    const journalEntries = await listJournalEntries(user.id);
    
    // Get prescriptions
    const { listObjects, signedUrl } = await import("@/lib/r2Client");
    let prescriptionUrls: string[] = [];
    try {
      const prefix = `prescriptions/${user.id}/`;
      const objects = await listObjects(prefix);
      prescriptionUrls = await Promise.all(
        (objects || []).slice(0, 5).map(async (obj) => await signedUrl(obj.Key!))
      );
    } catch (err) {
      console.error("Failed to fetch prescriptions for recommendation:", err);
    }
    
    // Get recent questions and answers
    const { listMotherQuestions } = await import("@/lib/data");
    const questions = await listMotherQuestions(user.id);
    const questionsAndAnswers = questions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(q => ({
        question: q.question,
        answer: q.answer,
      }));
    
    // Generate recommendation
    const recommendation = await generateJournalRecommendation(
      mother,
      journalEntries,
      timeOfDay,
      prescriptionUrls,
      questionsAndAnswers
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
    
    // Update last notification date
    const { saveMother } = await import("@/lib/data");
    await saveMother({
      ...mother,
      [lastNotificationKey]: today,
      updatedAt: new Date().toISOString(),
    });

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

