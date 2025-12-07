import { NextRequest, NextResponse } from "next/server";
import { listAllMothers } from "@/lib/data";
import { getCurrentDateInTimezone, getCurrentTimeInTimezone } from "@/lib/pregnancyTracker";
import { detectTimezoneFromIP } from "@/lib/timezoneDetector";

/**
 * This endpoint should be called by a cron job every 5 minutes
 * It will check all mothers and send recommendations at 8 AM and 8 PM in their local timezone
 * 
 * To set up a cron job:
 * - Vercel: Use Vercel Cron Jobs in vercel.json
 * - Other platforms: Set up a cron job to call this endpoint every 5 minutes
 * - Example: Run every 5 minutes using a cron service
 */
export async function GET(req: NextRequest) {
  try {
    const mothers = await listAllMothers();
    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process each mother
    for (const mother of mothers) {
      try {
        // Skip paused mothers
        if (mother.status === "paused") {
          results.skipped++;
          continue;
        }

        // Get mother's timezone (use stored timezone or detect from address)
        const timezone = mother.timezone || (await detectTimezoneFromIP("", mother.address));
        
        const { hour, minute } = getCurrentTimeInTimezone(timezone);
        const today = getCurrentDateInTimezone(timezone);
        
        // Check if it's 8:00-8:05 AM or 8:00-8:05 PM
        let timeOfDay: "morning" | "evening" | null = null;
        
        if (hour === 8 && minute >= 0 && minute <= 5 && mother.lastMorningAdviceDate !== today) {
          timeOfDay = "morning";
        } else if (hour === 20 && minute >= 0 && minute <= 5 && mother.lastNightAdviceDate !== today) {
          timeOfDay = "evening";
        }

        if (!timeOfDay) {
          results.skipped++;
          continue;
        }

        // Call the recommendation generation endpoint for this mother
        // We'll create a helper function to generate recommendations without auth
        const { generateRecommendationForMother } = await import("@/lib/recommendationHelper");
        const success = await generateRecommendationForMother(mother.id, timeOfDay, timezone);
        
        if (success) {
          results.sent++;
        } else {
          results.errors.push(`Failed to send recommendation to ${mother.email || mother.id}`);
        }
        
        results.processed++;
      } catch (error: any) {
        console.error(`Error processing mother ${mother.id}:`, error);
        results.errors.push(`Error for ${mother.email || mother.id}: ${error.message}`);
        results.processed++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Failed to process recommendations", message: error.message },
      { status: 500 }
    );
  }
}

