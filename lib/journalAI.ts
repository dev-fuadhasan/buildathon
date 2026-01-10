/**
 * AI Recommendation System for Daily Journal Entries
 * Analyzes journal entries and provides personalized recommendations
 */

import { MotherProfile, DailyEntry, listDailyEntries, listMotherQuestions, ChatMessage } from "./data";
import { askMomsCare } from "./momsCareChat";
import { getCurrentTimeInTimezone, getCurrentDateInTimezone } from "./pregnancyTracker";

/**
 * Generates AI recommendation based on journal entries, profile, prescriptions, Q&A, and past recommendations
 */
export async function generateJournalRecommendation(
  mother: MotherProfile,
  dailyEntries: DailyEntry[],
  timeOfDay: "morning" | "evening",
  prescriptionUrls?: string[],
  questionsAndAnswers?: Array<{ question: string; answer?: string }>,
  pastRecommendations?: string[],
  dailyRoutineContext?: string,
  chatHistory?: ChatMessage[]
): Promise<string> {
  try {
    // Filter entries to only include recent ones (within last 14 days from current date)
    const today = getCurrentDateInTimezone(mother.timezone || "UTC");
    const todayDate = new Date(today);
    
    const recentEntries = dailyEntries
      .filter(entry => {
        const entryDate = new Date(entry.date);
        const daysDiff = (todayDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 14; // Only entries from last 14 days
      })
      .sort((a, b) => {
        const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 20); // Get up to 20 most recent entries
    
    // Build context from daily entries, grouping by date
    const entriesByDate = recentEntries.reduce((acc, entry) => {
      if (!acc[entry.date]) {
        acc[entry.date] = [];
      }
      acc[entry.date].push(entry);
      return acc;
    }, {} as Record<string, DailyEntry[]>);
    
    const journalContext = Object.entries(entriesByDate)
      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
      .slice(0, 7) // Last 7 days
      .map(([date, entries]) => {
        const dateStr = new Date(date).toLocaleDateString();
        const entriesText = entries
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((entry, idx) => `Entry ${idx + 1} (${new Date(entry.createdAt).toLocaleTimeString()}): ${entry.entry}`)
          .join("\n\n");
        return `Date: ${dateStr}\n${entriesText}`;
      })
      .join("\n\n---\n\n");
    
    // Build profile context
    const daysPregnant = mother.daysPregnant || (mother.weeksPregnant ? mother.weeksPregnant * 7 : undefined);
    const weeksPregnant = daysPregnant ? Math.floor(daysPregnant / 7) : mother.weeksPregnant;
    const monthsPregnant = daysPregnant ? Math.floor(daysPregnant / 30) : undefined;
    
    // Get location from address
    const location = mother.address || "Unknown";
    
    const profileContext = `
Name: ${mother.name || "N/A"}
Age: ${mother.age || "N/A"}
Days Pregnant: ${daysPregnant || "N/A"} (${weeksPregnant || "N/A"} weeks${monthsPregnant ? `, ${monthsPregnant} months` : ""})
Medical Conditions: ${mother.conditions || "None"}
Medications: ${mother.medications || "None"}
Allergies: ${mother.allergies || "None"} - CRITICAL: Consider allergies in all recommendations
Blood Group: ${mother.bloodGroup || "N/A"}
Location: ${location} - Consider location-based availability and cultural preferences
Previous Pregnancies: ${mother.previousPregnancies || 0}
`;
    
    // Build Q&A context
    let qaContext = "";
    if (questionsAndAnswers && questionsAndAnswers.length > 0) {
      const recentQA = questionsAndAnswers.slice(0, 5); // Last 5 Q&As
      qaContext = recentQA
        .map((qa) => {
          if (qa.answer) {
            return `Q: ${qa.question}\nA: ${qa.answer}`;
          }
          return `Q: ${qa.question} (Not yet answered)`;
        })
        .join("\n\n---\n\n");
    }

    // Build chat history context
    let chatContext = "";
    if (chatHistory && chatHistory.length > 0) {
      // Get last 10 messages for context
      const recentMessages = chatHistory
        .slice(-10)
        .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n");
      chatContext = `Recent Chat History:\n${recentMessages}`;
    }
    
    // Create prompt based on time of day
    const timePrompt = timeOfDay === "morning"
      ? "Good morning! Based on the mother's COMPLETE and UPDATED profile, recent daily journal entries (only from last 14 days), prescriptions/reports, chat conversation history, daily routine status, and previous questions/answers, provide a personalized, medically valid morning recommendation for today. Consider: current pregnancy stage, allergies (DO NOT suggest allergenic foods), medical conditions, medications, location, and all available data. Focus on: nutrition tips, activity suggestions, self-care reminders, medication compliance (if prescriptions exist), and any concerns to watch for. Keep it warm, supportive, medically accurate, and actionable (2-3 sentences). DO NOT use any predefined suggestions - generate everything based on the provided context."
      : "Good evening! Based on the mother's COMPLETE and UPDATED profile, recent daily journal entries (only from last 14 days), prescriptions/reports, chat conversation history, daily routine status, and previous questions/answers, provide a personalized, medically valid evening recommendation. Consider: current pregnancy stage, allergies (DO NOT suggest allergenic foods), medical conditions, medications, location, and all available data. Focus on: rest suggestions, reflection on the day, preparation for tomorrow, medication reminders (if prescriptions exist), and any health reminders. Keep it warm, supportive, medically accurate, and actionable (2-3 sentences). DO NOT use any predefined suggestions - generate everything based on the provided context.";
    
    let fullContext = `${timePrompt}\n\nCOMPLETE PROFILE (use all this information):\n${profileContext}\n\nRecent Journal Entries (only from last 14 days - current date: ${today}):\n${journalContext || "No recent entries. Encourage the mother to start journaling."}`;
    
    if (chatContext) {
      fullContext += `\n\n${chatContext}`;
    }
    
    if (qaContext) {
      fullContext += `\n\nRecent Questions & Answers:\n${qaContext}`;
    }
    
    if (prescriptionUrls && prescriptionUrls.length > 0) {
      fullContext += `\n\nPrescriptions/Reports: The mother has ${prescriptionUrls.length} prescription/report file(s) on file. Consider medication compliance, test results, and any prescription-related advice.`;
    }
    
    // Add daily routine context if available
    if (dailyRoutineContext) {
      fullContext += `\n\n${dailyRoutineContext}`;
      if (timeOfDay === "evening") {
        fullContext += "In your evening recommendation, acknowledge their daily routine progress and encourage them to continue tracking meals and exercises for better health monitoring.";
      }
    }
    
    // Add past recommendations context to avoid duplicates
    if (pastRecommendations && pastRecommendations.length > 0) {
      fullContext += `\n\nPast Recommendations/Suggestions/Tips/Advice (to avoid repeating similar content):\n${pastRecommendations.slice(0, 10).join("\n\n---\n\n")}`;
      fullContext += `\n\nIMPORTANT: Review the past recommendations above and ensure your new recommendation is different, fresh, and provides new value. Avoid repeating similar advice, tips, or suggestions.`;
    }
    
    fullContext += `\n\nCRITICAL REQUIREMENTS:
1. Use ONLY the provided context - DO NOT use any predefined suggestions, tips, or recommendations
2. All recommendations must be AI-generated based on the mother's specific profile and current data
3. Consider current date: ${today} - only use data from recent entries (last 14 days)
4. Consider allergies: ${mother.allergies || "None"} - DO NOT suggest anything containing allergens
5. Consider location: ${location} - provide location-appropriate suggestions
6. Consider medical conditions and medications
7. Provide medically valid, personalized recommendations
8. Use the same language as the journal entries (English, Bengali, or Banglish)`;
    
    const systemMessage = {
      role: "user",
      content: fullContext,
    };
    
    const recommendation = await askMomsCare(
      [systemMessage],
      profileContext,
      prescriptionUrls, // Pass prescription URLs for analysis
      mother.daysPregnant ? Math.floor(mother.daysPregnant / 7) : undefined,
      true, // isPersonal
      true, // isLoggedIn
      {
        motherId: mother.id,
      }
    );
    
    return recommendation.trim();
  } catch (err) {
    console.error("Error generating journal recommendation:", err);
    // Return empty string or retry - no predefined fallback
    // The calling function should handle empty responses
    throw new Error("Failed to generate AI recommendation. Please try again.");
  }
}

/**
 * Checks if it's time to generate a new recommendation
 */
export function shouldGenerateRecommendation(
  timezone: string,
  timeOfDay: "morning" | "evening",
  lastNotificationDate?: string
): boolean {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  const { hour } = getCurrentTimeInTimezone(timezone);
  
  // Morning recommendation at 8 AM
  if (timeOfDay === "morning" && hour === 8) {
    return lastNotificationDate !== today;
  }
  
  // Evening recommendation at 8 PM
  if (timeOfDay === "evening" && hour === 20) {
    return lastNotificationDate !== today;
  }
  
  return false;
}

