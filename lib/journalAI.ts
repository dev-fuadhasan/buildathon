/**
 * AI Recommendation System for Daily Journal Entries
 * Analyzes journal entries and provides personalized recommendations
 */

import { MotherProfile, DailyJournalEntry, listJournalEntries, listMotherQuestions } from "./data";
import { askMomsCare } from "./momsCareChat";
import { getCurrentTimeInTimezone } from "./pregnancyTracker";

/**
 * Generates AI recommendation based on journal entries, profile, prescriptions, and Q&A
 */
export async function generateJournalRecommendation(
  mother: MotherProfile,
  journalEntries: DailyJournalEntry[],
  timeOfDay: "morning" | "evening",
  prescriptionUrls?: string[],
  questionsAndAnswers?: Array<{ question: string; answer?: string }>
): Promise<string> {
  try {
    // Get recent journal entries (last 7 days)
    const recentEntries = journalEntries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);
    
    // Build context from journal entries
    const journalContext = recentEntries
      .map((entry) => {
        const date = new Date(entry.date).toLocaleDateString();
        return `Date: ${date}\nEntry: ${entry.entry}`;
      })
      .join("\n\n---\n\n");
    
    // Build profile context
    const daysPregnant = mother.daysPregnant || (mother.weeksPregnant ? mother.weeksPregnant * 7 : undefined);
    const weeksPregnant = daysPregnant ? Math.floor(daysPregnant / 7) : mother.weeksPregnant;
    const monthsPregnant = daysPregnant ? Math.floor(daysPregnant / 30) : undefined;
    
    const profileContext = `
Name: ${mother.name || "N/A"}
Age: ${mother.age || "N/A"}
Days Pregnant: ${daysPregnant || "N/A"} (${weeksPregnant || "N/A"} weeks${monthsPregnant ? `, ${monthsPregnant} months` : ""})
Medical Conditions: ${mother.conditions || "None"}
Medications: ${mother.medications || "None"}
Allergies: ${mother.allergies || "None"}
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
    
    // Create prompt based on time of day
    const timePrompt = timeOfDay === "morning"
      ? "Good morning! Based on the mother's recent daily journal entries, profile, prescriptions (if any), and previous questions/answers, provide a brief, encouraging morning recommendation for today. Focus on: nutrition tips, activity suggestions, self-care reminders, medication compliance (if prescriptions exist), and any concerns to watch for. Keep it warm, supportive, and actionable (2-3 sentences)."
      : "Good evening! Based on the mother's recent daily journal entries, profile, prescriptions (if any), and previous questions/answers, provide a brief, supportive evening recommendation. Focus on: rest suggestions, reflection on the day, preparation for tomorrow, medication reminders (if prescriptions exist), and any health reminders. Keep it warm, supportive, and actionable (2-3 sentences).";
    
    let fullContext = `${timePrompt}\n\nProfile:\n${profileContext}\n\nRecent Journal Entries:\n${journalContext || "No entries yet. Encourage the mother to start journaling."}`;
    
    if (qaContext) {
      fullContext += `\n\nRecent Questions & Answers:\n${qaContext}`;
    }
    
    if (prescriptionUrls && prescriptionUrls.length > 0) {
      fullContext += `\n\nNote: The mother has ${prescriptionUrls.length} prescription(s) on file. Consider medication compliance and any prescription-related advice.`;
    }
    
    fullContext += `\n\nPlease provide a personalized recommendation in the same language as the journal entries (English, Bengali, or Banglish).`;
    
    const systemMessage = {
      role: "user",
      content: fullContext,
    };
    
    const recommendation = await askMomsCare(
      [systemMessage],
      profileContext,
      prescriptionUrls, // Pass prescription URLs for analysis
      mother.daysPregnant ? Math.floor(mother.daysPregnant / 7) : undefined
    );
    
    return recommendation;
  } catch (err) {
    console.error("Error generating journal recommendation:", err);
    return timeOfDay === "morning"
      ? "Good morning! Remember to stay hydrated, eat nutritious meals, and take time for yourself today. If you have any concerns, don't hesitate to contact your healthcare provider."
      : "Good evening! Take time to rest and relax. Make sure you're getting enough sleep and staying comfortable. Tomorrow is a new day!";
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

