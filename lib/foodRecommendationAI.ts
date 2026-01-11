/**
 * AI Daily Routine Recommendation System
 * Generates personalized food and exercise recommendations for expectant mothers
 */

import { MotherProfile, DailyEntry, DailyRoutine, getChatHistory, ChatMessage, Question } from "./data";
import { askMomsCare } from "./momsCareChat";
import { listObjects, signedUrl } from "./r2Client";
import { LocationData } from "./locationDetector";

/**
 * Generates daily routine recommendations (breakfast, lunch, dinner, exercises) based on:
 * - Mother's pregnancy stage
 * - Medical conditions and allergies
 * - Recent daily entries (only current/recent dates)
 * - Chat conversation history
 * - Prescriptions and reports
 * - Location (from IP detection with full address, culture, climate)
 * - Doctor Q&A history
 * - Previous recommendations to avoid repetition
 */
export async function generateDailyRoutineRecommendations(
  mother: MotherProfile,
  dailyEntries: DailyEntry[],
  pastRecommendations?: DailyRoutine[],
  prescriptionUrls?: string[],
  chatHistory?: ChatMessage[],
  locationData?: LocationData,
  doctorQAs?: Question[]
): Promise<{ 
  breakfast: string; 
  lunch: string; 
  dinner: string; 
  exercises: string; 
  waterIntake?: string;
  exerciseVideos?: Array<{
    videoId: string;
    title: string;
    description: string;
    thumbnail: string;
    channelTitle: string;
    duration?: string;
    viewCount?: string;
    publishedAt?: string;
  }>;
}> {
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

    // Get location from locationData (IP-based) or fallback to address
    let location = "Location not specified";
    let locationContext = "";
    
    if (locationData) {
      // Use detected location data
      location = locationData.address || 
                 `${locationData.city}, ${locationData.region}, ${locationData.country}` ||
                 "Location not specified";
      
      locationContext = `
LOCATION DETAILS (Detected from IP):
- Full Address: ${location}
- Country: ${locationData.country} (${locationData.countryCode})
- Region/State: ${locationData.region}
- City: ${locationData.city}
- Postal Code: ${locationData.postalCode || "N/A"}
- Culture: ${locationData.culture || "Global"}
- Climate: ${locationData.climate || "temperate"}
- Setting: ${locationData.urbanRural || "urban"}
- Timezone: ${locationData.timezone || "Asia/Dhaka"}
- Coordinates: ${locationData.latitude ? `${locationData.latitude}, ${locationData.longitude}` : "N/A"}
`;
    } else {
      // Fallback to address from profile
      const addressParts = [];
      if (mother.address && mother.address.trim()) {
        addressParts.push(mother.address.trim());
      }
      if (mother.area && mother.area.trim()) {
        addressParts.push(mother.area.trim());
      }
      location = addressParts.length > 0 
        ? addressParts.join(", ") 
        : "Location not specified";
      
      locationContext = `Location: ${location} (from profile address)`;
    }
    
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

    // Build doctor Q&A context
    let doctorQAContext = "";
    if (doctorQAs && doctorQAs.length > 0) {
      doctorQAContext = doctorQAs
        .slice(0, 5)
        .map((qa, idx) => `Q${idx + 1}: ${qa.question}\nA${idx + 1}: ${qa.answer}`)
        .join("\n\n---\n\n");
    }

    const profileContext = `
Name: ${mother.name || "N/A"}
Age: ${mother.age || "N/A"}
Days Pregnant: ${daysPregnant || "N/A"} (${weeksPregnant || "N/A"} weeks${trimester ? `, Trimester ${trimester}` : ""})
Medical Conditions: ${mother.conditions || "None"}
Medications: ${mother.medications || "None"}
Allergies: ${mother.allergies || "None"} - CRITICAL: DO NOT suggest any foods containing these allergens
Blood Group: ${mother.bloodGroup || "N/A"}
Previous Pregnancies: ${mother.previousPregnancies || 0}
${locationContext}
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
    // CRITICAL: Analyze ALL available user data before generating recommendations
    const prompt = `You are a medical expert specializing in pregnancy care, nutrition, and safe exercise for expectant mothers. 

BEFORE generating recommendations, you MUST analyze ALL of the following user data:

1. PROFILE ANALYSIS:
${profileContext}

2. LOCATION ANALYSIS (CRITICAL - FROM IP DETECTION):
${locationContext}
   - You MUST use this location data to suggest foods that are:
     * Actually available in this specific location (${locationData?.city || "city"}, ${locationData?.region || "region"}, ${locationData?.country || "country"})
     * Culturally appropriate for ${locationData?.culture || "the local"} culture
     * Suitable for ${locationData?.climate || "the local"} climate
     * Appropriate for ${locationData?.urbanRural || "urban"} setting
     * Seasonally appropriate (consider current season in this location)
   - For exercises, consider:
     * Climate: ${locationData?.climate || "temperate"} (affects exercise choices - hot/cold/tropical)
     * Setting: ${locationData?.urbanRural || "urban"} (affects available space - apartments vs open areas)
     * Cultural norms: ${locationData?.culture || "Global"} (affects acceptable exercise types)
     * Local facilities: Consider what exercise facilities are typically available in ${locationData?.urbanRural || "urban"} ${locationData?.country || "areas"}
   - DO NOT use generic or predefined food lists
   - Suggest what's ACTUALLY available and culturally appropriate in this specific location

3. PRESCRIPTIONS/REPORTS ANALYSIS:
${prescriptionContext || "No prescriptions/reports available. No medical restrictions from documents."}
   - If prescriptions exist, analyze them for any dietary restrictions or exercise limitations
   - Consider any medical instructions from uploaded documents

4. CHAT HISTORY ANALYSIS:
${chatContext || "No recent chat history available."}
   - Review recent conversations for:
     * Health concerns mentioned
     * Symptoms discussed
     * Questions about food or exercise
     * Any specific requests or preferences

5. DAILY ENTRIES ANALYSIS:
${entriesContext || "No recent journal entries available."}
   - Review recent daily entries for:
     * What foods were actually eaten
     * How the mother is feeling
     * Any symptoms or concerns
     * Activity levels
     * Energy levels
     * Sleep patterns
   - Use this to adjust recommendations based on actual daily patterns

6. DOCTOR Q&A ANALYSIS:
${doctorQAContext || "No recent doctor Q&As available."}
   - Review doctor's answers for:
     * Specific dietary recommendations
     * Exercise restrictions or suggestions
     * Health concerns addressed
     * Medical advice given
   - Incorporate doctor's professional advice into recommendations

7. PAST RECOMMENDATIONS ANALYSIS:
${pastRoutineContext || "No past recommendations available."}
   - Review what was recommended before
   - Ensure variety - don't repeat the same foods/exercises
   - Build on what worked well

CRITICAL MEDICAL GUIDELINES:
1. ALLERGIES: The mother has allergies: ${mother.allergies || "None"}. DO NOT suggest ANY foods containing these allergens. This is a safety requirement.
2. Medical Conditions: Consider ${mother.conditions || "None"} - ensure recommendations are safe for these conditions
3. Medications: Consider interactions with ${mother.medications || "None"}
4. Pregnancy Stage: Currently ${weeksPregnant || "N/A"} weeks pregnant (Trimester ${trimester || "N/A"}) - adjust recommendations accordingly
5. Exercise Safety: Only suggest simple, safe exercises appropriate for pregnancy stage. Avoid high-impact, risky activities. Consider the location's climate, available space, and cultural context.
6. Medical Validity: All recommendations must be medically sound and safe for pregnancy
7. WATER INTAKE: Include specific water drinking recommendations based on pregnancy stage, climate, and activity level

IMPORTANT: 
- Analyze ALL the data above before generating recommendations
- Location-based food suggestions are CRITICAL - suggest what's actually available in the detected location, but DO NOT mention location names in the recommendation text
- Consider all context: profile, location, prescriptions, chat, daily entries, past recommendations
- Generate personalized, medically valid recommendations based on COMPLETE analysis
- CRITICAL: Use location data to inform recommendations (what foods are available, what exercises are suitable), but keep the recommendation text clean without mentioning location, area, city, or country names

Please provide recommendations in the following JSON format:
{
  "breakfast": "Specific breakfast recommendation with details, considering allergies and medical conditions. DO NOT mention location, area, city, or country names in the recommendation text. Just suggest the foods naturally.",
  "lunch": "Specific lunch recommendation with details, considering allergies and medical conditions. DO NOT mention location, area, city, or country names in the recommendation text. Just suggest the foods naturally.",
  "dinner": "Specific dinner recommendation with details, considering allergies and medical conditions. DO NOT mention location, area, city, or country names in the recommendation text. Just suggest the foods naturally.",
  "exercises": "Simple, safe exercise recommendations appropriate for ${weeksPregnant || "N/A"} weeks pregnancy. DO NOT mention location, area, city, or country names in the recommendation text. Just suggest exercises naturally. Examples: '15-minute gentle walk, 10 minutes of prenatal yoga stretches, breathing exercises'",
  "waterIntake": "Specific water drinking recommendations based on pregnancy stage (${weeksPregnant || "N/A"} weeks) and activity level. Include daily amount and timing suggestions (e.g., 'Drink 8-10 glasses (2-2.5 liters) of water throughout the day. Increase intake if in hot climate or after exercise. Drink water between meals, not during meals.')"
}

IMPORTANT LOCATION ANALYSIS (USE FOR CONTEXT ONLY - DO NOT MENTION IN RECOMMENDATIONS):
- Location detected: ${location}
- Country: ${locationData?.country || "Unknown"} (${locationData?.countryCode || "N/A"})
- Culture: ${locationData?.culture || "Global"} - suggest culturally appropriate foods (but don't mention culture name)
- Climate: ${locationData?.climate || "temperate"} - adjust recommendations for climate (but don't mention climate name)
- Setting: ${locationData?.urbanRural || "urban"} - consider available space and facilities (but don't mention setting)
- Suggest foods that are ACTUALLY available in this location, but DO NOT mention the location name, city, region, or country in the recommendation text
- Consider local cuisine, seasonal availability, and cultural preferences, but present recommendations naturally without location references
- For exercises, adapt to climate and setting, but DO NOT mention location, area, city, or country names in the exercise recommendation text
- CRITICAL: Use location data to inform your recommendations, but keep the recommendation text clean and natural without any location mentions

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
    let routineData: { 
      breakfast: string; 
      lunch: string; 
      dinner: string; 
      exercises: string; 
      waterIntake?: string;
    };
    
    try {
      // Extract JSON from response (handle cases where AI adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        routineData = JSON.parse(jsonMatch[0]);
        // Ensure exercises field exists
        if (!routineData.exercises) {
          routineData.exercises = "15-minute gentle walk, 10 minutes of prenatal yoga stretches";
        }
        // Ensure waterIntake field exists (add default if missing)
        if (!routineData.waterIntake) {
          routineData.waterIntake = `Drink 8-10 glasses (2-2.5 liters) of water throughout the day. Increase intake if in hot climate or after exercise. Drink water between meals, not during meals.`;
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
        exercises: "15-minute gentle walk, 10 minutes of prenatal yoga stretches",
        waterIntake: "Drink 8-10 glasses (2-2.5 liters) of water throughout the day. Increase intake if in hot climate or after exercise. Drink water between meals, not during meals."
      };
    }

    // Search for YouTube exercise videos based on recommended exercises
    let exerciseVideos: any[] = [];
    try {
      const { searchExerciseVideos } = await import("./youtubeClient");
      console.log(`[Food Recommendation] Searching YouTube videos for exercises: "${routineData.exercises}"`);
      exerciseVideos = await searchExerciseVideos(routineData.exercises, 3);
      if (exerciseVideos.length > 0) {
        console.log(`[Food Recommendation] ✅ Found ${exerciseVideos.length} exercise video(s)`);
      } else {
        console.log(`[Food Recommendation] ⚠️ No exercise videos found`);
      }
    } catch (videoError: any) {
      console.error(`[Food Recommendation] Error searching for exercise videos:`, videoError.message);
      // Continue without videos - not critical
    }

    return {
      ...routineData,
      exerciseVideos: exerciseVideos.length > 0 ? exerciseVideos : undefined,
    };
  } catch (error: any) {
    console.error("Error generating daily routine recommendations:", error);
    // Return default recommendations on error (safe for pregnancy)
    return {
      breakfast: "Oatmeal with fresh fruits and a glass of milk",
      lunch: "Grilled chicken/fish with steamed vegetables and brown rice",
      dinner: "Lentil soup with whole grain roti and fresh salad",
      exercises: "15-minute gentle walk, 10 minutes of prenatal yoga stretches",
      waterIntake: "Drink 8-10 glasses (2-2.5 liters) of water throughout the day. Increase intake if in hot climate or after exercise. Drink water between meals, not during meals."
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

