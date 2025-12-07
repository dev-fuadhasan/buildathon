import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getMother, listDailyEntries, saveNotification, getNotifications, Notification } from "@/lib/data";
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
    
    console.log(`[Timezone Detection] IP: ${ip}, Detected Timezone: ${timezone}, Mother Address: ${mother.address}`);
    
    // Update timezone in profile if not set or different
    if (mother.timezone !== timezone) {
      const { saveMother } = await import("@/lib/data");
      await saveMother({
        ...mother,
        timezone,
        updatedAt: new Date().toISOString(),
      });
    }
    
    const { hour, minute, second } = getCurrentTimeInTimezone(timezone);
    const today = getCurrentDateInTimezone(timezone);
    
    // Log current time for debugging
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
    console.log(`[Recommendation Check] Timezone: ${timezone}, Local Time: ${timeStr}, Date: ${today}, Last Morning: ${mother.lastMorningAdviceDate}, Last Evening: ${mother.lastNightAdviceDate}`);
    
    // Determine which recommendation should be sent
    // STRICT TIMING: Only send at exactly 8:00 AM and 8:00 PM (with 5 minute window for checking)
    // Morning recommendation: ONLY at 8:00-8:05 AM
    // Evening recommendation: ONLY at 8:00-8:05 PM (20:00-20:05)
    let timeOfDay: "morning" | "evening" | null = null;
    
    // Check if it's exactly 8:00-8:05 AM and morning recommendation hasn't been sent today
    if (hour === 8 && minute >= 0 && minute <= 5 && mother.lastMorningAdviceDate !== today) {
      timeOfDay = "morning";
      console.log(`[Recommendation] ✅ Sending morning recommendation at ${timeStr} (${timezone})`);
    }
    // Check if it's exactly 8:00-8:05 PM (20:00-20:05) and evening recommendation hasn't been sent today
    else if (hour === 20 && minute >= 0 && minute <= 5 && mother.lastNightAdviceDate !== today) {
      timeOfDay = "evening";
      console.log(`[Recommendation] ✅ Sending evening recommendation at ${timeStr} (${timezone})`);
    }
    // DO NOT send recommendations at any other time - only at 8 AM and 8 PM
    else {
      console.log(`[Recommendation] ⏭️ Skipping - Current time ${timeStr} is not 8:00-8:05 AM or 8:00-8:05 PM`);
    }

    if (!timeOfDay) {
      return NextResponse.json({
        message: "All recommendations for today have been sent",
        currentHour: hour,
        currentMinute: minute,
        timezone,
        lastMorningAdviceDate: mother.lastMorningAdviceDate,
        lastNightAdviceDate: mother.lastNightAdviceDate,
      });
    }
    
    // Check if we already generated recommendation for this time today
    const lastNotificationKey = timeOfDay === "morning" ? "lastMorningAdviceDate" : "lastNightAdviceDate";
    if (mother[lastNotificationKey] === today) {
      return NextResponse.json({
        message: "Recommendation already generated for this time today",
        timeOfDay,
      });
    }

    // Get daily entries
    const dailyEntries = await listDailyEntries(user.id);
    
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

    // Get past recommendations to avoid duplicates
    const pastNotifications = await getNotifications(user.id);
    const pastRecommendations = pastNotifications
      .filter(n => n.type === "morning_recommendation" || n.type === "evening_recommendation")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10) // Last 10 recommendations
      .map(n => n.message || n.content || "")
      .filter(Boolean);
    
    // Generate recommendation
    const recommendation = await generateJournalRecommendation(
      mother,
      dailyEntries,
      timeOfDay,
      prescriptionUrls,
      questionsAndAnswers,
      pastRecommendations
    );

    // Create notification
    const notification: Notification = {
      id: uuid(),
      motherId: user.id,
      type: timeOfDay === "morning" ? "morning_recommendation" : "evening_recommendation",
      title: timeOfDay === "morning" ? "Morning Recommendation" : "Evening Recommendation",
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

