/**
 * Helper functions for generating recommendations
 * Can be called from cron jobs or authenticated endpoints
 */

import { getMother, listDailyEntries, saveNotification, getNotifications, Notification, saveMother, getFoodRecommendation, getChatHistory } from "./data";
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
    const todayDate = new Date(today);
    const lastNotificationKey = timeOfDay === "morning" ? "lastMorningAdviceDate" : "lastNightAdviceDate";
    
    // Double-check we haven't already sent today
    if (mother[lastNotificationKey] === today) {
      console.log(`Recommendation already sent to ${motherId} for ${timeOfDay} today`);
      return false;
    }

    // Get daily entries and filter to only recent ones (within last 14 days)
    const allDailyEntries = await listDailyEntries(motherId);
    const dailyEntries = allDailyEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      const daysDiff = (todayDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 14; // Only entries from last 14 days
    });
    
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

    // Get chat history for context
    let chatHistory = null;
    try {
      chatHistory = await getChatHistory(motherId);
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    }

    // Get today's daily routine data
    let dailyRoutineContext = "";
    try {
      const todayRoutine = await getFoodRecommendation(motherId, today);
      if (todayRoutine) {
        const eatenCount = [
          todayRoutine.breakfastEaten,
          todayRoutine.lunchEaten,
          todayRoutine.dinnerEaten,
        ].filter(Boolean).length;
        const exercisesDone = todayRoutine.exercisesDone || false;
        
        dailyRoutineContext = `Daily Routine Status: `;
        if (eatenCount > 0) {
          dailyRoutineContext += `Food: ${eatenCount}/3 meals tracked. `;
        }
        if (exercisesDone) {
          dailyRoutineContext += `Exercises: Completed. `;
        } else {
          dailyRoutineContext += `Exercises: Not yet completed. `;
        }
        if (todayRoutine.dailyReport) {
          dailyRoutineContext += `Daily report available with analysis. `;
        }
      }
    } catch (err) {
      console.error("Failed to fetch daily routine data:", err);
    }

    // Generate recommendation with all context
    let recommendation: string;
    try {
      recommendation = await generateJournalRecommendation(
        mother,
        dailyEntries,
        timeOfDay,
        prescriptionUrls,
        questionsAndAnswers,
        pastRecommendations,
        dailyRoutineContext,
        chatHistory?.messages
      );
    } catch (error: any) {
      console.error(`Error generating recommendation for ${motherId}:`, error);
      // If generation fails, don't create a notification - return false
      return false;
    }

    // Ensure recommendation is not empty
    if (!recommendation || recommendation.trim().length === 0) {
      console.error(`Empty recommendation generated for ${motherId}`);
      return false;
    }

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

