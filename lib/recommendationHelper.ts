/**
 * Helper functions for generating recommendations
 * Can be called from cron jobs or authenticated endpoints
 */

import { getMother, listDailyEntries, saveNotification, getNotifications, Notification, saveMother } from "./data";
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
    
    // Get recent questions and answers
    const { listMotherQuestions } = await import("./data");
    const questions = await listMotherQuestions(motherId);
    const questionsAndAnswers = questions
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

    // Generate recommendation with past recommendations context
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

