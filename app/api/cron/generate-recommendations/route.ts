import { NextRequest, NextResponse } from "next/server";
import { listAllMothers, getAdminSettings } from "@/lib/data";
import { getCurrentDateInTimezone, getCurrentTimeInTimezone } from "@/lib/pregnancyTracker";
import { detectTimezoneFromIP } from "@/lib/timezoneDetector";

/**
 * This endpoint should be called by a cron job every 5 minutes
 * It will:
 * 1. Check all mothers and send recommendations at configured times (default 8 AM and 8 PM) in their local timezone
 * 2. Update pregnancy days at 12:00 AM (midnight) in their local timezone
 * 3. Mark daily questions as ready at configured time (default 9 PM) in their local timezone
 * 
 * To set up a cron job:
 * - Vercel: Use Vercel Cron Jobs in vercel.json
 * - Other platforms: Set up a cron job to call this endpoint every 5 minutes
 * - Example: Run every 5 minutes using a cron service
 */
export async function GET(req: NextRequest) {
  try {
    const mothers = await listAllMothers();
    const settings = await getAdminSettings();
    
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
      questions: {
        triggered: 0,
        skipped: 0,
      },
      dailyReports: {
        generated: 0,
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
        
        // Get settings values
        const morningHour = settings.morningRecommendationHour;
        const morningMinute = settings.morningRecommendationMinute ?? 0;
        const eveningHour = settings.eveningRecommendationHour;
        const eveningMinute = settings.eveningRecommendationMinute ?? 0;
        const questionHour = settings.questionHour;
        const questionMinute = settings.questionMinute ?? 0;
        
        // Log for debugging (only log when it's close to important times to avoid spam)
        if ((hour === morningHour - 1 && minute >= 55) || (hour === morningHour && minute <= morningMinute + 5) || 
            (hour === eveningHour - 1 && minute >= 55) || (hour === eveningHour && minute <= eveningMinute + 5) ||
            (hour === questionHour - 1 && minute >= 55) || (hour === questionHour && minute <= questionMinute + 5) ||
            (hour === 23 && minute >= 30) || (hour === 0 && minute <= 5)) {
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
        
        // 2. Check and send recommendations at configured times (default 8:00 AM and 20:00 PM)
        let timeOfDay: "morning" | "evening" | null = null;
        
        if (hour === settings.morningRecommendationHour && minute >= morningMinute && minute <= morningMinute + 5 && mother.lastMorningAdviceDate !== today) {
          timeOfDay = "morning";
          console.log(`[Cron] ✅ Sending morning recommendation to ${mother.email || mother.id} at ${hour}:${minute.toString().padStart(2, '0')} (${timezone})`);
        } else if (hour === settings.eveningRecommendationHour && minute >= eveningMinute && minute <= eveningMinute + 5 && mother.lastNightAdviceDate !== today) {
          timeOfDay = "evening";
          console.log(`[Cron] ✅ Sending evening recommendation to ${mother.email || mother.id} at ${hour}:${minute.toString().padStart(2, '0')} (${timezone})`);
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
        
        // 3. Check and trigger daily questions at configured time (default 21:00 / 9 PM)
        // Note: We don't set lastQuestionDate here - it will be set when mother actually answers questions
        // The popup will show if lastQuestionDate !== today, so questions will be available after the configured time
        if (hour === questionHour && minute >= questionMinute && minute <= questionMinute + 5) {
          // Questions are now available for today - they will be shown when mother opens the site
          // The API endpoint will check if lastQuestionDate !== today and show questions
          results.questions.triggered++;
          console.log(`[Cron] ✅ Daily questions available for ${mother.email || mother.id} at ${hour}:${minute.toString().padStart(2, '0')} (${timezone})`);
        } else {
          results.questions.skipped++;
        }

        // 4. Generate daily routine report after 11:30 PM (23:30-23:35)
        // Generate report for today's routine (the day that's ending)
        if (hour === 23 && minute >= 30 && minute <= 35) {
          try {
            const { getFoodRecommendation, saveFoodRecommendation, getMother } = await import("@/lib/data");
            const { generateDailyRoutineReport } = await import("@/lib/dailyRoutineReportAI");
            
            // Get today's routine to generate report for
            const routine = await getFoodRecommendation(mother.id, today);
            
            if (routine && !routine.dailyReport) {
              // Generate report only if it doesn't exist
              const updatedMother = await getMother(mother.id);
              if (updatedMother) {
                const report = await generateDailyRoutineReport(routine, updatedMother);
                routine.dailyReport = report;
                routine.updatedAt = new Date().toISOString();
                await saveFoodRecommendation(routine);
                results.dailyReports.generated++;
                console.log(`[Cron] ✅ Generated daily routine report for ${mother.email || mother.id} for ${today} (${timezone})`);
              }
            } else {
              results.dailyReports.skipped++;
            }
          } catch (error: any) {
            console.error(`Error generating daily routine report for ${mother.id}:`, error);
            results.errors.push(`Daily report error for ${mother.email || mother.id}: ${error.message}`);
          }
        } else {
          results.dailyReports.skipped++;
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

