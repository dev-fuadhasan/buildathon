/**
 * AI Daily Routine Report Generation
 * Generates daily reports based on what the mother marked as eaten/done
 */

import { DailyRoutine, MotherProfile } from "./data";
import { askMomsCare } from "./momsCareChat";

/**
 * Generates a daily routine report based on what was eaten/done
 * This should be called after 11:30 PM daily via cron job
 */
export async function generateDailyRoutineReport(
  routine: DailyRoutine,
  mother: MotherProfile
): Promise<DailyRoutine["dailyReport"]> {
  try {
    const daysPregnant = mother.daysPregnant || (mother.weeksPregnant ? mother.weeksPregnant * 7 : undefined);
    const weeksPregnant = daysPregnant ? Math.floor(daysPregnant / 7) : mother.weeksPregnant;

    // Determine what was eaten and not eaten
    const eatenMeals: string[] = [];
    const notEatenMeals: string[] = [];

    if (routine.breakfastEaten) {
      eatenMeals.push(`Breakfast: ${routine.breakfast}`);
    } else {
      notEatenMeals.push(`Breakfast: ${routine.breakfast}`);
    }

    if (routine.lunchEaten) {
      eatenMeals.push(`Lunch: ${routine.lunch}`);
    } else {
      notEatenMeals.push(`Lunch: ${routine.lunch}`);
    }

    if (routine.dinnerEaten) {
      eatenMeals.push(`Dinner: ${routine.dinner}`);
    } else {
      notEatenMeals.push(`Dinner: ${routine.dinner}`);
    }

    const exercisesDone = routine.exercisesDone || false;

    // Build context
    const profileContext = `
Name: ${mother.name || "N/A"}
Age: ${mother.age || "N/A"}
Days Pregnant: ${daysPregnant || "N/A"} (${weeksPregnant || "N/A"} weeks)
Medical Conditions: ${mother.conditions || "None"}
Medications: ${mother.medications || "None"}
Allergies: ${mother.allergies || "None"}
Blood Group: ${mother.bloodGroup || "N/A"}
`;

    const prompt = `You are a medical expert analyzing a pregnant mother's daily routine completion for ${routine.date}.

${profileContext}

Daily Routine Recommendations:
- Breakfast: ${routine.breakfast}
- Lunch: ${routine.lunch}
- Dinner: ${routine.dinner}
- Exercises: ${routine.exercises}

What was completed:
${eatenMeals.length > 0 ? eatenMeals.map(m => `✅ ${m}`).join("\n") : "None"}
${exercisesDone ? `✅ Exercises: ${routine.exercises}` : "❌ Exercises: Not done"}

What was not completed:
${notEatenMeals.length > 0 ? notEatenMeals.map(m => `❌ ${m}`).join("\n") : "All meals were eaten"}

Based on this information, provide a comprehensive medical analysis in JSON format:
{
  "foodAnalysis": {
    "eaten": [${eatenMeals.length > 0 ? `"${eatenMeals.join('", "')}"` : ""}],
    "notEaten": [${notEatenMeals.length > 0 ? `"${notEatenMeals.map(m => m.replace(/"/g, "'")).join('", "')}"` : ""}],
    "benefits": ["List specific medical benefits from the meals that were eaten, considering pregnancy stage and health profile"],
    "negativeImpacts": ["List specific potential negative impacts from meals not eaten, considering pregnancy nutritional needs"],
    "status": "good" | "moderate" | "poor"
  },
  "exerciseAnalysis": {
    "done": ${exercisesDone},
    ${exercisesDone ? `"benefits": ["List specific medical benefits from doing the exercises during pregnancy"]` : `"negativeImpacts": ["List specific potential negative impacts from not doing exercises during pregnancy"]`},
    "status": "good" | "moderate" | "poor"
  },
  "overallStatus": "good" | "moderate" | "poor"
}

IMPORTANT:
- Be medically accurate and specific
- Consider the pregnancy stage (${weeksPregnant || "N/A"} weeks)
- Consider medical conditions and allergies
- Use red/yellow/green status indicators (good=green, moderate=yellow, poor=red)
- Provide actionable insights

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
      undefined,
      weeksPregnant,
      true,
      true,
      {
        motherId: mother.id,
      }
    );

    // Parse JSON response
    let reportData: DailyRoutine["dailyReport"];
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        reportData = {
          id: `report-${routine.date}-${Date.now()}`,
          date: routine.date,
          foodAnalysis: {
            eaten: parsed.foodAnalysis?.eaten || eatenMeals,
            notEaten: parsed.foodAnalysis?.notEaten || notEatenMeals,
            benefits: parsed.foodAnalysis?.benefits || [],
            negativeImpacts: parsed.foodAnalysis?.negativeImpacts || [],
            status: parsed.foodAnalysis?.status || (eatenMeals.length >= 2 ? "good" : eatenMeals.length === 1 ? "moderate" : "poor"),
          },
          exerciseAnalysis: {
            done: exercisesDone,
            benefits: parsed.exerciseAnalysis?.benefits || (exercisesDone ? [] : undefined),
            negativeImpacts: parsed.exerciseAnalysis?.negativeImpacts || (exercisesDone ? undefined : []),
            status: parsed.exerciseAnalysis?.status || (exercisesDone ? "good" : "poor"),
          },
          overallStatus: parsed.overallStatus || (eatenMeals.length >= 2 && exercisesDone ? "good" : eatenMeals.length >= 1 || exercisesDone ? "moderate" : "poor"),
          createdAt: new Date().toISOString(),
        };
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Error parsing daily routine report JSON:", parseError);
      // Fallback report
      reportData = {
        id: `report-${routine.date}-${Date.now()}`,
        date: routine.date,
        foodAnalysis: {
          eaten: eatenMeals,
          notEaten: notEatenMeals,
          benefits: eatenMeals.length > 0 ? ["Maintained nutrition intake"] : [],
          negativeImpacts: notEatenMeals.length > 0 ? ["Missed important nutrients"] : [],
          status: eatenMeals.length >= 2 ? "good" : eatenMeals.length === 1 ? "moderate" : "poor",
        },
        exerciseAnalysis: {
          done: exercisesDone,
          benefits: exercisesDone ? ["Maintained physical activity"] : undefined,
          negativeImpacts: exercisesDone ? undefined : ["Missed exercise benefits"],
          status: exercisesDone ? "good" : "poor",
        },
        overallStatus: eatenMeals.length >= 2 && exercisesDone ? "good" : eatenMeals.length >= 1 || exercisesDone ? "moderate" : "poor",
        createdAt: new Date().toISOString(),
      };
    }

    return reportData;
  } catch (error: any) {
    console.error("Error generating daily routine report:", error);
    // Return basic fallback report
    const eatenMeals: string[] = [];
    const notEatenMeals: string[] = [];
    
    if (routine.breakfastEaten) eatenMeals.push(`Breakfast: ${routine.breakfast}`);
    else notEatenMeals.push(`Breakfast: ${routine.breakfast}`);
    if (routine.lunchEaten) eatenMeals.push(`Lunch: ${routine.lunch}`);
    else notEatenMeals.push(`Lunch: ${routine.lunch}`);
    if (routine.dinnerEaten) eatenMeals.push(`Dinner: ${routine.dinner}`);
    else notEatenMeals.push(`Dinner: ${routine.dinner}`);

    return {
      id: `report-${routine.date}-${Date.now()}`,
      date: routine.date,
      foodAnalysis: {
        eaten: eatenMeals,
        notEaten: notEatenMeals,
        benefits: [],
        negativeImpacts: [],
        status: eatenMeals.length >= 2 ? "good" : eatenMeals.length === 1 ? "moderate" : "poor",
      },
      exerciseAnalysis: {
        done: routine.exercisesDone || false,
        status: routine.exercisesDone ? "good" : "poor",
      },
      overallStatus: eatenMeals.length >= 2 && routine.exercisesDone ? "good" : eatenMeals.length >= 1 || routine.exercisesDone ? "moderate" : "poor",
      createdAt: new Date().toISOString(),
    };
  }
}

