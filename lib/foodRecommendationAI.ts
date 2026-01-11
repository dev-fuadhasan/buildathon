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

YOUR TASK: Generate personalized daily routine recommendations (breakfast, lunch, dinner, exercises) based on COMPLETE analysis of ALL provided data.

CRITICAL REQUIREMENT: You MUST analyze and use ALL the following data to generate recommendations:

1. PROFILE ANALYSIS:
${profileContext}

2. LOCATION ANALYSIS (CRITICAL - FROM IP DETECTION - USE THIS TO GENERATE PROPER RECOMMENDATIONS):
${locationContext}

LOCATION-BASED RECOMMENDATION RULES:
   - Country: ${locationData?.country || "Unknown"} (${locationData?.countryCode || "N/A"})
   - Culture: ${locationData?.culture || "Global"}
   - Climate: ${locationData?.climate || "temperate"}
   - Setting: ${locationData?.urbanRural || "urban"}
   - City/Region: ${locationData?.city || "Unknown"}, ${locationData?.region || "Unknown"}

FOOD RECOMMENDATIONS MUST BE:
   * Actually available and commonly found in ${locationData?.country || "this country"} (${locationData?.culture || "this culture"})
   * Typical foods from ${locationData?.culture || "this cultural"} cuisine that are safe for pregnancy
   * Suitable for ${locationData?.climate || "this climate"} climate (e.g., hot foods in cold climate, cooling foods in hot climate)
   * Appropriate for ${locationData?.urbanRural || "urban"} setting (consider what's typically available)
   * Use actual food names from ${locationData?.culture || "this cultural"} cuisine (e.g., if South Asian: roti, dal, biryani, if Western: pasta, salad, if Middle Eastern: hummus, falafel, etc.)
   * DO NOT use generic lists - suggest REAL foods from this location's cuisine

EXERCISE RECOMMENDATIONS MUST BE:
   * Suitable for ${locationData?.climate || "temperate"} climate (hot: indoor/early morning, cold: indoor/warm-up needed, tropical: consider humidity)
   * Appropriate for ${locationData?.urbanRural || "urban"} setting (urban: indoor/home exercises, rural: outdoor options available)
   * Culturally acceptable for ${locationData?.culture || "this culture"} (consider local exercise preferences and facilities)
   * Consider what exercise facilities/space are typically available in ${locationData?.urbanRural || "urban"} ${locationData?.country || "areas"}

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
1. ALLERGIES - CRITICAL SAFETY REQUIREMENT: The mother has allergies: ${mother.allergies || "None"}. 
   
   YOU MUST INTELLIGENTLY ANALYZE the allergen and identify ALL related foods WITHOUT using predefined lists. Use your knowledge of food relationships, categories, and ingredients.
   
   ANALYSIS PROCESS:
   a) Identify the FOOD CATEGORY of the allergen (e.g., bread, dairy, nuts, seafood, grains, etc.)
   b) Identify ALL foods in that same category (e.g., if allergic to "ruti" (roti/bread), avoid ALL bread types: porota/paratha, naan, pita, toast, etc.)
   c) Identify foods that CONTAIN the allergen as an ingredient
   d) Identify foods that are DERIVATIVES or VARIATIONS of the allergen
   e) Identify foods with CROSS-CONTAMINATION risks
   
   EXAMPLES OF INTELLIGENT DETECTION (DO NOT hardcode these - use as examples of the thinking process):
   - If allergic to "ruti" (roti/bread in Bangla): Avoid porota/paratha, naan, pita, toast, bread, roti, chapati, kulcha - ALL bread/flour-based items
   - If allergic to "dudh" (milk in Bangla): Avoid all dairy - cheese, yogurt, butter, cream, paneer, ghee, ice cream, etc.
   - If allergic to "badam" (almonds): Avoid all tree nuts - cashews, walnuts, pistachios, hazelnuts, etc.
   - If allergic to "mach" (fish): Avoid all seafood - shrimp, crab, lobster, etc.
   - If allergic to "dim" (eggs): Avoid all egg-containing foods - cakes, mayonnaise, pasta, etc.
   
   CRITICAL RULES:
   - DO NOT suggest the allergen itself (in any language - English, Bangla, or Banglish)
   - DO NOT suggest foods in the SAME CATEGORY as the allergen
   - DO NOT suggest foods that CONTAIN the allergen as an ingredient
   - DO NOT suggest foods that are DERIVATIVES or VARIATIONS of the allergen
   - DO NOT suggest foods with CROSS-CONTAMINATION risks
   - UNDERSTAND food relationships: bread types are related, dairy products are related, nuts are related, seafood is related, etc.
   - This is a SAFETY REQUIREMENT - be thorough and comprehensive in identifying all foods to avoid
   - Use your knowledge to intelligently identify relationships - DO NOT rely on exact name matching only
2. Medical Conditions: Consider ${mother.conditions || "None"} - ensure recommendations are safe for these conditions
3. Medications: Consider interactions with ${mother.medications || "None"}
4. Pregnancy Stage: Currently ${weeksPregnant || "N/A"} weeks pregnant (Trimester ${trimester || "N/A"}) - adjust recommendations accordingly
5. Exercise Safety: Only suggest simple, safe exercises appropriate for pregnancy stage. Avoid high-impact, risky activities. Consider the location's climate, available space, and cultural context.
6. Medical Validity: All recommendations must be medically sound and safe for pregnancy
7. WATER INTAKE: Include specific water drinking recommendations based on pregnancy stage, climate, and activity level

GENERATION INSTRUCTIONS:
1. FIRST: Read and understand ALL the data above (profile, location, prescriptions, chat, daily entries, doctor Q&As, past recommendations)
2. SECOND: Based on the location data (${locationData?.country || "country"}, ${locationData?.culture || "culture"}, ${locationData?.climate || "climate"}), identify what foods are ACTUALLY available and commonly eaten in this location
3. THIRD: Generate recommendations that:
   - Use REAL food names from ${locationData?.culture || "this cultural"} cuisine
   - Are appropriate for ${locationData?.climate || "this climate"} climate
   - Consider ${locationData?.urbanRural || "urban"} setting
   - Respect allergies: ${mother.allergies || "None"} - NEVER suggest:
     * The allergen itself
     * Foods containing the allergen as an ingredient
     * Related foods (e.g., if allergic to peanuts, avoid all tree nuts; if allergic to dairy, avoid all dairy products)
     * Foods with cross-contamination risks
     * Any variation or derivative of the allergen
   - Consider medical conditions: ${mother.conditions || "None"}
   - Are appropriate for ${weeksPregnant || "N/A"} weeks pregnancy (Trimester ${trimester || "N/A"})
   - Are different from past recommendations (avoid repetition)
   - Incorporate advice from doctor Q&As if provided
   - Consider recent daily entries and chat history

4. DO NOT mention location names, city names, area names, or country names in the recommendation text
5. DO NOT use generic food lists - use actual food names from the detected location's cuisine
6. Make recommendations specific, detailed, and actionable

EXAMPLE FORMAT (adapt based on location):
- If South Asian location: "Roti with dal and vegetable curry, fresh yogurt, and seasonal fruits"
- If Western location: "Whole grain toast with eggs, fresh fruit, and a glass of milk"
- If Middle Eastern location: "Hummus with whole wheat pita, fresh vegetables, and olives"

Please provide recommendations in the following JSON format:
{
  "breakfast": "Specific breakfast with actual food names from ${locationData?.culture || "this cultural"} cuisine, considering allergies (${mother.allergies || "None"}), medical conditions (${mother.conditions || "None"}), and pregnancy stage (${weeksPregnant || "N/A"} weeks). Include portion suggestions and preparation tips.",
  "lunch": "Specific lunch with actual food names from ${locationData?.culture || "this cultural"} cuisine, considering allergies (${mother.allergies || "None"}), medical conditions (${mother.conditions || "None"}), and pregnancy stage (${weeksPregnant || "N/A"} weeks). Include portion suggestions and preparation tips.",
  "dinner": "Specific dinner with actual food names from ${locationData?.culture || "this cultural"} cuisine, considering allergies (${mother.allergies || "None"}), medical conditions (${mother.conditions || "None"}), and pregnancy stage (${weeksPregnant || "N/A"} weeks). Include portion suggestions and preparation tips.",
  "exercises": "Specific exercise recommendations appropriate for ${weeksPregnant || "N/A"} weeks pregnancy, ${locationData?.climate || "temperate"} climate, ${locationData?.urbanRural || "urban"} setting. Include duration, frequency, and safety tips. Examples: '15-minute gentle walk in the morning or evening, 10 minutes of prenatal yoga stretches, 5 minutes of breathing exercises'",
  "waterIntake": "Specific water drinking recommendations for ${weeksPregnant || "N/A"} weeks pregnancy, ${locationData?.climate || "temperate"} climate. Include daily amount (liters/glasses), timing, and tips."
}

CRITICAL FINAL INSTRUCTIONS:
1. You MUST use the location data (${locationData?.country || "country"}, ${locationData?.culture || "culture"}) to suggest REAL foods from that cuisine
2. You MUST consider all medical data: allergies (${mother.allergies || "None"}), conditions (${mother.conditions || "None"}), medications (${mother.medications || "None"})
3. You MUST consider pregnancy stage: ${weeksPregnant || "N/A"} weeks (Trimester ${trimester || "N/A"})
4. You MUST avoid repeating past recommendations
5. You MUST incorporate doctor's advice if provided in Q&As
6. Generate SPECIFIC, DETAILED recommendations - not generic ones

EXAMPLE OUTPUTS (adapt to detected location):
If location is South Asian (Bangladesh, India, Pakistan):
- Breakfast: "Paratha with egg curry, fresh yogurt, and seasonal fruits like mango or banana. Include a glass of warm milk."
- Lunch: "Steamed rice with dal (lentil curry), mixed vegetable curry, fish curry (if no allergies), and fresh salad."
- Dinner: "Roti with chicken curry or vegetable curry, dal, and fresh vegetables. Keep it light and easy to digest."

If location is Western (USA, UK, Europe):
- Breakfast: "Whole grain toast with scrambled eggs, fresh fruit salad, and a glass of milk or orange juice."
- Lunch: "Grilled chicken or fish with steamed vegetables, brown rice, and a side salad."
- Dinner: "Light pasta with vegetables and lean protein, or soup with whole grain bread."

If location is Middle Eastern:
- Breakfast: "Hummus with whole wheat pita, fresh vegetables, olives, and feta cheese (if no dairy allergies)."
- Lunch: "Grilled chicken or fish with tabbouleh salad, rice, and fresh vegetables."
- Dinner: "Lentil soup with whole grain bread, fresh salad, and grilled vegetables."

Respond ONLY with valid JSON in the exact format specified above. No additional text, explanations, or markdown.`;

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
    
    console.log("[Food Recommendation] Raw AI response length:", response.length);
    console.log("[Food Recommendation] Raw AI response preview:", response.substring(0, 300));
    
    try {
      // Extract JSON from response (handle cases where AI adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        routineData = JSON.parse(jsonMatch[0]);
        console.log("[Food Recommendation] ✅ Successfully parsed JSON");
        
        // Validate and ensure all required fields exist with proper content
        const isSouthAsian = locationData?.culture === "South Asian";
        
        if (!routineData.breakfast || routineData.breakfast.trim().length < 10) {
          console.warn("[Food Recommendation] ⚠️ Breakfast too short, using location-based fallback");
          routineData.breakfast = isSouthAsian
            ? "Paratha with egg curry, fresh yogurt, and seasonal fruits. Include a glass of warm milk."
            : "Whole grain toast with eggs, fresh fruit, and a glass of milk";
        }
        
        if (!routineData.lunch || routineData.lunch.trim().length < 10) {
          console.warn("[Food Recommendation] ⚠️ Lunch too short, using location-based fallback");
          routineData.lunch = isSouthAsian
            ? "Steamed rice with dal (lentil curry), mixed vegetable curry, and fresh salad"
            : "Grilled chicken or fish with steamed vegetables and brown rice";
        }
        
        if (!routineData.dinner || routineData.dinner.trim().length < 10) {
          console.warn("[Food Recommendation] ⚠️ Dinner too short, using location-based fallback");
          routineData.dinner = isSouthAsian
            ? "Roti with chicken or vegetable curry, dal, and fresh vegetables. Keep it light and easy to digest."
            : "Light pasta with vegetables and lean protein, or soup with whole grain bread";
        }
        
        if (!routineData.exercises || routineData.exercises.trim().length < 10) {
          console.warn("[Food Recommendation] ⚠️ Exercises too short, using fallback");
          routineData.exercises = "15-minute gentle walk, 10 minutes of prenatal yoga stretches, breathing exercises";
        }
        
        if (!routineData.waterIntake || routineData.waterIntake.trim().length < 10) {
          console.warn("[Food Recommendation] ⚠️ Water intake too short, using fallback");
          routineData.waterIntake = `Drink 8-10 glasses (2-2.5 liters) of water throughout the day. Increase intake if in hot climate or after exercise. Drink water between meals, not during meals.`;
        }
        
        console.log("[Food Recommendation] ✅ Final validated recommendations");
      } else {
        console.error("[Food Recommendation] ❌ No JSON found in response");
        throw new Error("No JSON found in response");
      }
    } catch (parseError: any) {
      console.error("[Food Recommendation] ❌ Error parsing JSON:", parseError.message);
      console.error("[Food Recommendation] Raw response (first 1000 chars):", response.substring(0, 1000));
      
      // Fallback to location-appropriate recommendations
      const isSouthAsian = locationData?.culture === "South Asian";
      routineData = {
        breakfast: isSouthAsian
          ? "Paratha with egg curry, fresh yogurt, and seasonal fruits. Include a glass of warm milk."
          : "Whole grain toast with scrambled eggs, fresh fruit salad, and a glass of milk",
        lunch: isSouthAsian
          ? "Steamed rice with dal (lentil curry), mixed vegetable curry, and fresh salad"
          : "Grilled chicken or fish with steamed vegetables and brown rice",
        dinner: isSouthAsian
          ? "Roti with chicken or vegetable curry, dal, and fresh vegetables. Keep it light and easy to digest."
          : "Light pasta with vegetables and lean protein, or soup with whole grain bread",
        exercises: "15-minute gentle walk, 10 minutes of prenatal yoga stretches, breathing exercises",
        waterIntake: "Drink 8-10 glasses (2-2.5 liters) of water throughout the day. Increase intake if in hot climate or after exercise. Drink water between meals, not during meals."
      };
      console.log("[Food Recommendation] ⚠️ Using fallback recommendations for culture:", locationData?.culture);
    }

    // Search for YouTube exercise videos based on recommended exercises
    let exerciseVideos: any[] = [];
    try {
      const { searchExerciseVideos } = await import("./youtubeClient");
      console.log(`[Food Recommendation] Searching YouTube videos for exercises: "${routineData.exercises}"`);
      exerciseVideos = await searchExerciseVideos(routineData.exercises, 3);
      // Ensure maximum 3 videos (strict enforcement)
      exerciseVideos = exerciseVideos.slice(0, 3);
      if (exerciseVideos.length > 0) {
        console.log(`[Food Recommendation] ✅ Found ${exerciseVideos.length} exercise video(s) (max 3)`);
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

