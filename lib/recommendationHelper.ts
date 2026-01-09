/**
 * Helper functions for generating recommendations
 * Can be called from cron jobs or authenticated endpoints
 */

import { getMother, listDailyEntries, saveNotification, getNotifications, Notification, saveMother, getFoodRecommendation } from "./data";
import { generateJournalRecommendation } from "./journalAI";
import { getCurrentDateInTimezone } from "./pregnancyTracker";
import { v4 as uuid } from "uuid";

/**
 * Generates a recommendation for a specific mother
 * This function can be called without authentication (for cron jobs)
 */
export async function generateRecommendationForMother(
  motherId: string,
  timeOfDay: "morning" | "evening",
  timezone: string
): Promise<boolean> {
  try {
    const mother = await getMother(motherId);
    if (!mother) {
      console.error(`Mother not found: ${motherId}`);
      return false;
    }

    const today = getCurrentDateInTimezone(timezone);
    const lastNotificationKey = timeOfDay === "morning" ? "lastMorningAdviceDate" : "lastNightAdviceDate";
    
    // Double-check we haven't already sent today
    if (mother[lastNotificationKey] === today) {
      console.log(`Recommendation already sent to ${motherId} for ${timeOfDay} today`);
      return false;
    }

    // Get daily entries
    const dailyEntries = await listDailyEntries(motherId);
    
    // Get prescriptions
    const { listObjects, signedUrl } = await import("./r2Client");
    let prescriptionUrls: string[] = [];
    try {
      const prefix = `prescriptions/${motherId}/`;
      const objects = await listObjects(prefix);
      prescriptionUrls = await Promise.all(
        (objects || []).slice(0, 5).map(async (obj) => await signedUrl(obj.Key!))
      );
    } catch (err) {
      console.error("Failed to fetch prescriptions for recommendation:", err);
    }
    
    // Get recent questions and answers (exclude solved reports)
    const { listMotherQuestions } = await import("./data");
    const questions = await listMotherQuestions(motherId);
    // Filter out questions that have been solved by admin (reportStatus === "solved")
    const visibleQuestions = questions.filter(q => q.reportStatus !== "solved");
    const questionsAndAnswers = visibleQuestions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(q => ({
        question: q.question,
        answer: q.answer,
      }));

    // Get past recommendations to avoid duplicates
    const pastNotifications = await getNotifications(motherId);
    const pastRecommendations = pastNotifications
      .filter(n => n.type === "morning_recommendation" || n.type === "evening_recommendation")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10) // Last 10 recommendations
      .map(n => n.message || n.content || "")
      .filter(Boolean);

    // Get today's food tracking stats
    let foodTrackingStats = "";
    try {
      const todayFood = await getFoodRecommendation(motherId, today);
      if (todayFood) {
        const eatenCount = [
          todayFood.breakfastEaten,
          todayFood.lunchEaten,
          todayFood.dinnerEaten,
        ].filter(Boolean).length;
        
        if (eatenCount > 0) {
          foodTrackingStats = `Food Tracking: The mother has marked ${eatenCount} out of 3 recommended meals as eaten today. `;
          if (eatenCount === 3) {
            foodTrackingStats += "All meals have been tracked. ";
          } else {
            foodTrackingStats += `Still ${3 - eatenCount} meal(s) remaining to track. `;
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch food tracking stats:", err);
    }

    // Generate recommendation with past recommendations context and food tracking
    const recommendation = await generateJournalRecommendation(
      mother,
      dailyEntries,
      timeOfDay,
      prescriptionUrls,
      questionsAndAnswers,
      pastRecommendations,
      foodTrackingStats
    );

    // Create notification
    const notification: Notification = {
      id: uuid(),
      motherId: motherId,
      type: timeOfDay === "morning" ? "morning_recommendation" : "evening_recommendation",
      title: timeOfDay === "morning" ? "Morning Recommendation" : "Evening Recommendation",
      message: recommendation,
      read: false,
      createdAt: new Date().toISOString(),
    };

    await saveNotification(notification);
    
    // Update last notification date
    await saveMother({
      ...mother,
      [lastNotificationKey]: today,
      timezone, // Update timezone if not set
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ Recommendation sent to ${mother.email || motherId} at ${timeOfDay}`);
    return true;
  } catch (error: any) {
    console.error(`Error generating recommendation for ${motherId}:`, error);
    return false;
  }
}

