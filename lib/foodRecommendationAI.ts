/**
 * AI Food Recommendation System
 * Generates personalized food recommendations for expectant mothers
 */

import { MotherProfile, DailyEntry, FoodRecommendation } from "./data";
import { askMomsCare } from "./momsCareChat";

/**
 * Generates daily food recommendations (breakfast, lunch, dinner) based on:
 * - Mother's pregnancy stage
 * - Medical conditions and allergies
 * - Recent daily entries
 * - Previous food recommendations to avoid repetition
 */
export async function generateFoodRecommendations(
  mother: MotherProfile,
  dailyEntries: DailyEntry[],
  pastRecommendations?: FoodRecommendation[]
): Promise<{ breakfast: string; lunch: string; dinner: string }> {
  try {
    // Get recent daily entries (last 7 days)
    const recentEntries = dailyEntries
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

    const profileContext = `
Name: ${mother.name || "N/A"}
Age: ${mother.age || "N/A"}
Days Pregnant: ${daysPregnant || "N/A"} (${weeksPregnant || "N/A"} weeks${trimester ? `, Trimester ${trimester}` : ""})
Medical Conditions: ${mother.conditions || "None"}
Medications: ${mother.medications || "None"}
Allergies: ${mother.allergies || "None"}
Blood Group: ${mother.bloodGroup || "N/A"}
`;

    // Build recent entries context
    const entriesContext = recentEntries.length > 0
      ? recentEntries
          .slice(0, 7)
          .map((entry, idx) => `Date: ${entry.date}\nEntry: ${entry.entry}`)
          .join("\n\n---\n\n")
      : "No recent journal entries.";

    // Build past recommendations context to avoid repetition
    let pastFoodContext = "";
    if (pastRecommendations && pastRecommendations.length > 0) {
      const recentPast = pastRecommendations
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
      
      pastFoodContext = recentPast
        .map((rec) => `Date: ${rec.date}\nBreakfast: ${rec.breakfast}\nLunch: ${rec.lunch}\nDinner: ${rec.dinner}`)
        .join("\n\n---\n\n");
    }

    // Create prompt for food recommendations
    const prompt = `You are a nutrition expert specializing in pregnancy care. Based on the expectant mother's profile, pregnancy stage, medical conditions, allergies, and recent journal entries, provide personalized food recommendations for breakfast, lunch, and dinner.

IMPORTANT GUIDELINES:
1. Consider the pregnancy trimester and nutritional needs
2. Avoid foods that might cause allergies (check allergies field)
3. Consider any medical conditions
4. Provide culturally appropriate food suggestions (considering the mother might be from Bangladesh/South Asia)
5. Ensure balanced nutrition with essential vitamins, minerals, and proteins
6. Avoid foods that are unsafe during pregnancy
7. Make recommendations specific and actionable
8. If past recommendations exist, ensure variety and avoid repetition

${profileContext}

Recent Journal Entries:
${entriesContext}

${pastFoodContext ? `Past Food Recommendations (avoid repeating similar meals):\n${pastFoodContext}\n\nIMPORTANT: Review past recommendations and ensure variety. Don't repeat the same foods frequently.` : ""}

Please provide food recommendations in the following JSON format:
{
  "breakfast": "Specific breakfast recommendation with details (e.g., 'Oatmeal with fruits and nuts, whole grain toast with eggs')",
  "lunch": "Specific lunch recommendation with details (e.g., 'Grilled fish with steamed vegetables and brown rice')",
  "dinner": "Specific dinner recommendation with details (e.g., 'Lentil soup with roti and fresh salad')"
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
      undefined, // prescriptionUrls
      weeksPregnant,
      true, // isPersonal
      true, // isLoggedIn
      {
        motherId: mother.id,
      }
    );
    
    // Try to parse JSON from response
    let foodData: { breakfast: string; lunch: string; dinner: string };
    
    try {
      // Extract JSON from response (handle cases where AI adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        foodData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Error parsing food recommendation JSON:", parseError);
      // Fallback to default recommendations
      foodData = {
        breakfast: "Oatmeal with fresh fruits and a glass of milk",
        lunch: "Grilled chicken/fish with steamed vegetables and brown rice",
        dinner: "Lentil soup with whole grain roti and fresh salad"
      };
    }

    return foodData;
  } catch (error: any) {
    console.error("Error generating food recommendations:", error);
    // Return default recommendations on error
    return {
      breakfast: "Oatmeal with fresh fruits and a glass of milk",
      lunch: "Grilled chicken/fish with steamed vegetables and brown rice",
      dinner: "Lentil soup with whole grain roti and fresh salad"
    };
  }
}

