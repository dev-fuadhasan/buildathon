import { NextRequest, NextResponse } from "next/server";
import { listAllMothers } from "@/lib/data";
import { getCurrentDateInTimezone, getCurrentTimeInTimezone } from "@/lib/pregnancyTracker";
import { detectTimezoneFromIP } from "@/lib/timezoneDetector";

/**
 * This endpoint should be called by a cron job every 5 minutes
 * It will:
 * 1. Check all mothers and send recommendations at 8 AM and 8 PM in their local timezone
 * 2. Update pregnancy days at 12:00 AM (midnight) in their local timezone
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
      recommendations: {
        sent: 0,
        skipped: 0,
      },
      pregnancyUpdates: {
        updated: 0,
        skipped: 0,
      },
      errors: [] as string[],
    };

    // Process each mother
    for (const mother of mothers) {
      try {
        // Skip paused mothers
        if (mother.status === "paused") {
          continue;
        }

        // Get mother's timezone (use stored timezone or detect from address)
        const timezone = mother.timezone || (await detectTimezoneFromIP("", mother.address));
        
        const { hour, minute } = getCurrentTimeInTimezone(timezone);
        const today = getCurrentDateInTimezone(timezone);
        
        // Log for debugging (only log when it's close to important times to avoid spam)
        if ((hour === 7 && minute >= 55) || (hour === 8 && minute <= 10) || 
            (hour === 19 && minute >= 55) || (hour === 20 && minute <= 10) ||
            (hour === 0 && minute <= 5)) {
          console.log(`[Cron] Mother ${mother.email || mother.id} - Timezone: ${timezone}, Local Time: ${hour}:${minute.toString().padStart(2, '0')}, Date: ${today}`);
        }
        
        // 1. Check and update pregnancy progress at midnight (12:00-12:05 AM)
        if (hour === 0 && minute >= 0 && minute <= 5) {
          try {
            const { updatePregnancyProgress } = await import("@/lib/pregnancyTracker");
            // This function will check if it's already been updated today and update if needed
            await updatePregnancyProgress(mother.id, timezone);
            // Check if it was actually updated by checking the last update date
            const { getMother } = await import("@/lib/data");
            const updatedMother = await getMother(mother.id);
            if (updatedMother?.lastPregnancyDayUpdate === today) {
              results.pregnancyUpdates.updated++;
              console.log(`[Cron] ✅ Updated pregnancy day for ${mother.email || mother.id} (${timezone})`);
            } else {
              results.pregnancyUpdates.skipped++;
            }
          } catch (error: any) {
            console.error(`Error updating pregnancy progress for ${mother.id}:`, error);
            results.errors.push(`Pregnancy update error for ${mother.email || mother.id}: ${error.message}`);
          }
        } else {
          results.pregnancyUpdates.skipped++;
        }
        
        // 2. Check and send recommendations at 8:00-8:05 AM or 8:00-8:05 PM
        let timeOfDay: "morning" | "evening" | null = null;
        
        if (hour === 8 && minute >= 0 && minute <= 5 && mother.lastMorningAdviceDate !== today) {
          timeOfDay = "morning";
          console.log(`[Cron] ✅ Sending morning recommendation to ${mother.email || mother.id} (${timezone})`);
        } else if (hour === 20 && minute >= 0 && minute <= 5 && mother.lastNightAdviceDate !== today) {
          timeOfDay = "evening";
          console.log(`[Cron] ✅ Sending evening recommendation to ${mother.email || mother.id} (${timezone})`);
        }

        if (timeOfDay) {
          try {
            const { generateRecommendationForMother } = await import("@/lib/recommendationHelper");
            const success = await generateRecommendationForMother(mother.id, timeOfDay, timezone);
            
            if (success) {
              results.recommendations.sent++;
            } else {
              results.errors.push(`Failed to send recommendation to ${mother.email || mother.id}`);
            }
          } catch (error: any) {
            console.error(`Error sending recommendation to ${mother.id}:`, error);
            results.errors.push(`Recommendation error for ${mother.email || mother.id}: ${error.message}`);
          }
        } else {
          results.recommendations.skipped++;
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

