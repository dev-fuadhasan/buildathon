/**
 * AI Daily Routine Recommendation System
 * Generates personalized food and exercise recommendations for expectant mothers
 */

import { MotherProfile, DailyEntry, DailyRoutine, getChatHistory, ChatMessage } from "./data";
import { askMomsCare } from "./momsCareChat";
import { listObjects, signedUrl } from "./r2Client";

/**
 * Generates daily routine recommendations (breakfast, lunch, dinner, exercises) based on:
 * - Mother's pregnancy stage
 * - Medical conditions and allergies
 * - Recent daily entries (only current/recent dates)
 * - Chat conversation history
 * - Prescriptions and reports
 * - Location (from address)
 * - Previous recommendations to avoid repetition
 */
export async function generateDailyRoutineRecommendations(
  mother: MotherProfile,
  dailyEntries: DailyEntry[],
  pastRecommendations?: DailyRoutine[],
  prescriptionUrls?: string[],
  chatHistory?: ChatMessage[]
): Promise<{ breakfast: string; lunch: string; dinner: string; exercises: string }> {
  try {
    // Get current date to filter only recent entries (not old ones from weeks ago)
    const today = new Date().toISOString().split("T")[0];
    const todayDate = new Date(today);
    
    // Filter entries to only include recent ones (within last 14 days)
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
      .slice(0, 10);

    // Build profile context
    const daysPregnant = mother.daysPregnant || (mother.weeksPregnant ? mother.weeksPregnant * 7 : undefined);
    const weeksPregnant = daysPregnant ? Math.floor(daysPregnant / 7) : mother.weeksPregnant;
    const trimester = daysPregnant ? Math.floor(daysPregnant / 90) + 1 : (weeksPregnant ? Math.floor(weeksPregnant / 13) + 1 : undefined);

    // Get location from address
    const location = mother.address || "Unknown";
    
    // Get chat history if not provided
    let chatContext = "";
    if (!chatHistory) {
      try {
        const history = await getChatHistory(mother.id);
        if (history?.messages && history.messages.length > 0) {
          // Get last 10 messages for context
          const recentMessages = history.messages
            .slice(-10)
            .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
            .join("\n");
          chatContext = `Recent Chat History:\n${recentMessages}`;
        }
      } catch (err) {
        console.error("Error fetching chat history:", err);
      }
    } else {
      const recentMessages = chatHistory
        .slice(-10)
        .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n");
      chatContext = `Recent Chat History:\n${recentMessages}`;
    }

    // Get prescriptions if not provided
    let prescriptionContext = "";
    if (!prescriptionUrls || prescriptionUrls.length === 0) {
      try {
        const prefix = `prescriptions/${mother.id}/`;
        const objects = await listObjects(prefix);
        prescriptionUrls = await Promise.all(
          (objects || []).slice(0, 5).map(async (obj) => await signedUrl(obj.Key!))
        );
      } catch (err) {
        console.error("Error fetching prescriptions:", err);
      }
    }
    if (prescriptionUrls && prescriptionUrls.length > 0) {
      prescriptionContext = `Prescriptions/Reports Available: ${prescriptionUrls.length} file(s) uploaded. Consider any medical instructions from these documents.`;
    }

    const profileContext = `
Name: ${mother.name || "N/A"}
Age: ${mother.age || "N/A"}
Days Pregnant: ${daysPregnant || "N/A"} (${weeksPregnant || "N/A"} weeks${trimester ? `, Trimester ${trimester}` : ""})
Medical Conditions: ${mother.conditions || "None"}
Medications: ${mother.medications || "None"}
Allergies: ${mother.allergies || "None"} - CRITICAL: DO NOT suggest any foods containing these allergens
Blood Group: ${mother.bloodGroup || "N/A"}
Location: ${location} - Consider location-based food availability and cultural preferences
Previous Pregnancies: ${mother.previousPregnancies || 0}
`;

    // Build recent entries context
    const entriesContext = recentEntries.length > 0
      ? recentEntries
          .slice(0, 7)
          .map((entry, idx) => `Date: ${entry.date}\nEntry: ${entry.entry}`)
          .join("\n\n---\n\n")
      : "No recent journal entries.";

    // Build past recommendations context to avoid repetition
    let pastRoutineContext = "";
    if (pastRecommendations && pastRecommendations.length > 0) {
      const recentPast = pastRecommendations
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
      
      pastRoutineContext = recentPast
        .map((rec) => `Date: ${rec.date}\nBreakfast: ${rec.breakfast}\nLunch: ${rec.lunch}\nDinner: ${rec.dinner}\nExercises: ${rec.exercises || "N/A"}`)
        .join("\n\n---\n\n");
    }

    // Create prompt for daily routine recommendations
    const prompt = `You are a medical expert specializing in pregnancy care, nutrition, and safe exercise for expectant mothers. Based on the expectant mother's complete profile, provide medically valid and personalized recommendations for food (breakfast, lunch, dinner) and simple exercises.

CRITICAL MEDICAL GUIDELINES:
1. ALLERGIES: The mother has allergies: ${mother.allergies || "None"}. DO NOT suggest ANY foods containing these allergens. This is a safety requirement.
2. Medical Conditions: Consider ${mother.conditions || "None"} - ensure recommendations are safe for these conditions
3. Medications: Consider interactions with ${mother.medications || "None"}
4. Pregnancy Stage: Currently ${weeksPregnant || "N/A"} weeks pregnant (Trimester ${trimester || "N/A"}) - adjust recommendations accordingly
5. Location: Mother is in ${location} - suggest foods available in this location and culturally appropriate
6. Exercise Safety: Only suggest simple, safe exercises appropriate for pregnancy stage. Avoid high-impact, risky activities
7. Medical Validity: All recommendations must be medically sound and safe for pregnancy
8. Variety: If past recommendations exist, ensure variety and avoid repetition

${profileContext}

${prescriptionContext ? `${prescriptionContext}\n` : ""}

Recent Journal Entries (only from last 14 days):
${entriesContext || "No recent journal entries."}

${chatContext ? `${chatContext}\n` : ""}

${pastRoutineContext ? `Past Daily Routine Recommendations (avoid repeating similar items):\n${pastRoutineContext}\n\nIMPORTANT: Review past recommendations and ensure variety. Don't repeat the same foods or exercises frequently.` : ""}

Please provide recommendations in the following JSON format:
{
  "breakfast": "Specific breakfast recommendation with details, considering allergies, location, and medical conditions",
  "lunch": "Specific lunch recommendation with details, considering allergies, location, and medical conditions",
  "dinner": "Specific dinner recommendation with details, considering allergies, location, and medical conditions",
  "exercises": "Simple, safe exercise recommendations appropriate for ${weeksPregnant || "N/A"} weeks pregnancy (e.g., '15-minute gentle walk, 10 minutes of prenatal yoga stretches, breathing exercises')"
}

Respond ONLY with valid JSON, no additional text.`;

    const messages = [
      {
        role: "user",
        content: prompt,
      },
    ];

    const response = await askMomsCare(
      messages,
      profileContext,
      prescriptionUrls, // Include prescription URLs for context
      weeksPregnant,
      true, // isPersonal
      true, // isLoggedIn
      {
        motherId: mother.id,
      }
    );
    
    // Try to parse JSON from response
    let routineData: { breakfast: string; lunch: string; dinner: string; exercises: string };
    
    try {
      // Extract JSON from response (handle cases where AI adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        routineData = JSON.parse(jsonMatch[0]);
        // Ensure exercises field exists
        if (!routineData.exercises) {
          routineData.exercises = "15-minute gentle walk, 10 minutes of prenatal yoga stretches";
        }
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Error parsing daily routine recommendation JSON:", parseError);
      // Fallback to default recommendations (safe for pregnancy)
      routineData = {
        breakfast: "Oatmeal with fresh fruits and a glass of milk",
        lunch: "Grilled chicken/fish with steamed vegetables and brown rice",
        dinner: "Lentil soup with whole grain roti and fresh salad",
        exercises: "15-minute gentle walk, 10 minutes of prenatal yoga stretches"
      };
    }

    return routineData;
  } catch (error: any) {
    console.error("Error generating daily routine recommendations:", error);
    // Return default recommendations on error (safe for pregnancy)
    return {
      breakfast: "Oatmeal with fresh fruits and a glass of milk",
      lunch: "Grilled chicken/fish with steamed vegetables and brown rice",
      dinner: "Lentil soup with whole grain roti and fresh salad",
      exercises: "15-minute gentle walk, 10 minutes of prenatal yoga stretches"
    };
  }
}

// Keep backward compatibility
export async function generateFoodRecommendations(
  mother: MotherProfile,
  dailyEntries: DailyEntry[],
  pastRecommendations?: DailyRoutine[]
): Promise<{ breakfast: string; lunch: string; dinner: string }> {
  const result = await generateDailyRoutineRecommendations(mother, dailyEntries, pastRecommendations);
  return {
    breakfast: result.breakfast,
    lunch: result.lunch,
    dinner: result.dinner,
  };
}

