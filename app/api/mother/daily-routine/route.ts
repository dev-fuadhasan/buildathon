import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { 
  getMother, 
  listDailyEntries, 
  getFoodRecommendation, 
  saveFoodRecommendation,
  listFoodRecommendations,
  getChatHistory,
  listMotherQuestions
} from "@/lib/data";
import { listObjects, signedUrl } from "@/lib/r2Client";
import { getCurrentDateInTimezone } from "@/lib/pregnancyTracker";
import { getClientIP } from "@/lib/timezoneDetector";
import { detectLocationFromIP } from "@/lib/locationDetector";
import { generateDailyRoutineRecommendations } from "@/lib/foodRecommendationAI";
import { v4 as uuid } from "uuid";

/**
 * GET /api/mother/daily-routine
 * Get today's daily routine (exercise-focused) with location-based recommendations
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mother = await getMother(user.id);
    if (!mother) {
      return NextResponse.json({ error: "Mother not found" }, { status: 404 });
    }

    // Get date parameter or use today
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    
    // Detect location from IP
    const ip = getClientIP(req);
    const locationData = await detectLocationFromIP(ip);
    
    // Use location data or fallback to address
    const location = locationData.address || 
                     `${locationData.city}, ${locationData.region}, ${locationData.country}` ||
                     mother.address ||
                     "Unknown Location";
    
    console.log(`[Daily Routine] Location detected: ${location} (${locationData.culture}, ${locationData.climate}, ${locationData.urbanRural})`);
    
    // Get timezone from location
    const timezone = locationData.timezone || mother.timezone || "Asia/Dhaka";
    const today = getCurrentDateInTimezone(timezone);
    const date = dateParam || today;

    // Get ALL mother data
    console.log(`[Daily Routine] Fetching ALL mother data for comprehensive recommendations...`);
    
    // 1. Profile data (already have mother object)
    const profileData = {
      name: mother.name,
      age: mother.age,
      email: mother.email,
      phone: mother.phone,
      address: mother.address,
      bloodGroup: mother.bloodGroup,
      weeksPregnant: mother.weeksPregnant,
      daysPregnant: mother.daysPregnant,
      dueDate: mother.dueDate,
      previousPregnancies: mother.previousPregnancies,
      conditions: mother.conditions,
      allergies: mother.allergies,
      medications: mother.medications,
      emergencyContact: mother.emergencyContact,
      emergencyPhone: mother.emergencyPhone,
    };
    
    // 2. Daily entries (all recent entries)
    const dailyEntries = await listDailyEntries(user.id);
    console.log(`[Daily Routine] Found ${dailyEntries.length} daily entries`);
    
    // 3. Past recommendations
    const pastRecommendations = await listFoodRecommendations(user.id);
    console.log(`[Daily Routine] Found ${pastRecommendations.length} past recommendations`);
    
    // 4. Chat history
    const chatHistory = await getChatHistory(user.id);
    console.log(`[Daily Routine] Found ${chatHistory?.messages?.length || 0} chat messages`);
    
    // 5. Doctor Q&A
    const questions = await listMotherQuestions(user.id);
    const recentQAs = questions
      .filter(q => q.answer)
      .sort((a, b) => new Date(b.answeredAt || b.createdAt).getTime() - new Date(a.answeredAt || a.createdAt).getTime())
      .slice(0, 10);
    console.log(`[Daily Routine] Found ${recentQAs.length} recent doctor Q&As`);
    
    // 6. Prescriptions (get image URLs)
    let prescriptionUrls: string[] = [];
    try {
      const prefix = `prescriptions/${user.id}/`;
      const objects = await listObjects(prefix);
      const imageObjects = (objects || []).filter(obj => {
        const key = obj.Key || "";
        return (key.endsWith('.png') || key.endsWith('.jpg') || key.endsWith('.jpeg') ||
                key.endsWith('.PNG') || key.endsWith('.JPG') || key.endsWith('.JPEG')) &&
               !key.includes('metadata.json') && !key.endsWith('.pdf');
      });
      
      const recentImages = imageObjects
        .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
        .slice(0, 10);
      
      const urlResults = await Promise.all(
        recentImages.map(async (obj) => {
          try {
            return await signedUrl(obj.Key!);
          } catch {
            return null;
          }
        })
      );
      prescriptionUrls = urlResults.filter((url): url is string => url !== null);
      console.log(`[Daily Routine] Found ${prescriptionUrls.length} prescription images`);
    } catch (err) {
      console.error("[Daily Routine] Error fetching prescriptions:", err);
    }

    // Try to get existing recommendation
    let recommendation = await getFoodRecommendation(user.id, date);

    // If no recommendation exists and it's today, generate one
    if (!recommendation && date === today) {
      console.log(`[Daily Routine] Generating new recommendations with full context...`);
      
      // Generate recommendations with ALL data and location context
      const routineData = await generateDailyRoutineRecommendations(
        mother,
        dailyEntries,
        pastRecommendations,
        prescriptionUrls,
        chatHistory?.messages,
        locationData, // Pass full location data
        recentQAs // Pass doctor Q&As
      );

      // Create new recommendation
      const now = new Date().toISOString();
      recommendation = {
        id: uuid(),
        motherId: user.id,
        date: today,
        breakfast: routineData.breakfast,
        lunch: routineData.lunch,
        dinner: routineData.dinner,
        exercises: routineData.exercises,
        waterIntake: routineData.waterIntake || "Drink 8-10 glasses (2-2.5 liters) of water throughout the day. Increase intake if in hot climate or after exercise. Drink water between meals, not during meals.",
        exerciseVideos: routineData.exerciseVideos || undefined,
        breakfastEaten: false,
        lunchEaten: false,
        dinnerEaten: false,
        exercisesDone: false,
        createdAt: now,
        updatedAt: now,
      };

      await saveFoodRecommendation(recommendation);
      console.log(`[Daily Routine] ✅ Generated and saved new recommendations`);
    }

    if (!recommendation) {
      return NextResponse.json({
        recommendation: null,
        location: locationData,
        message: "No recommendation found for this date. Generate one for today.",
      });
    }

    return NextResponse.json({
      recommendation,
      location: locationData, // Return location data for UI
      profile: profileData,
    });
  } catch (error: any) {
    console.error("[Daily Routine] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch daily routine" },
      { status: 500 }
    );
  }
}

/**
 * POST: Generate new daily routine recommendations
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mother = await getMother(user.id);
    if (!mother) {
      return NextResponse.json({ error: "Mother not found" }, { status: 404 });
    }

    // Detect location from IP
    const ip = getClientIP(req);
    const locationData = await detectLocationFromIP(ip);
    const location = locationData.address || 
                     `${locationData.city}, ${locationData.region}, ${locationData.country}` ||
                     mother.address ||
                     "Unknown Location";
    
    const timezone = locationData.timezone || mother.timezone || "Asia/Dhaka";
    const today = getCurrentDateInTimezone(timezone);

    // Get ALL mother data (same as GET)
    const dailyEntries = await listDailyEntries(user.id);
    const pastRecommendations = await listFoodRecommendations(user.id);
    const chatHistory = await getChatHistory(user.id);
    const questions = await listMotherQuestions(user.id);
    const recentQAs = questions
      .filter(q => q.answer)
      .sort((a, b) => new Date(b.answeredAt || b.createdAt).getTime() - new Date(a.answeredAt || a.createdAt).getTime())
      .slice(0, 10);
    
    let prescriptionUrls: string[] = [];
    try {
      const prefix = `prescriptions/${user.id}/`;
      const objects = await listObjects(prefix);
      const imageObjects = (objects || []).filter(obj => {
        const key = obj.Key || "";
        return (key.endsWith('.png') || key.endsWith('.jpg') || key.endsWith('.jpeg') ||
                key.endsWith('.PNG') || key.endsWith('.JPG') || key.endsWith('.JPEG')) &&
               !key.includes('metadata.json') && !key.endsWith('.pdf');
      });
      const recentImages = imageObjects
        .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
        .slice(0, 10);
      const urlResults2 = await Promise.all(
        recentImages.map(async (obj) => {
          try {
            return await signedUrl(obj.Key!);
          } catch {
            return null;
          }
        })
      );
      prescriptionUrls = urlResults2.filter((url): url is string => url !== null);
    } catch (err) {
      console.error("Error fetching prescriptions:", err);
    }
    
    // Generate new recommendations
    const routineData = await generateDailyRoutineRecommendations(
      mother,
      dailyEntries,
      pastRecommendations,
      prescriptionUrls,
      chatHistory?.messages,
      locationData,
      recentQAs
    );

    // Create or update recommendation
    const now = new Date().toISOString();
    const existing = await getFoodRecommendation(user.id, today);
    
    const recommendation = {
      id: existing?.id || uuid(),
      motherId: user.id,
      date: today,
      breakfast: routineData.breakfast,
      lunch: routineData.lunch,
      dinner: routineData.dinner,
      exercises: routineData.exercises,
      waterIntake: routineData.waterIntake || "Drink 8-10 glasses (2-2.5 liters) of water throughout the day. Increase intake if in hot climate or after exercise. Drink water between meals, not during meals.",
      exerciseVideos: routineData.exerciseVideos || undefined,
      breakfastEaten: existing?.breakfastEaten || false,
      lunchEaten: existing?.lunchEaten || false,
      dinnerEaten: existing?.dinnerEaten || false,
      exercisesDone: existing?.exercisesDone || false,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await saveFoodRecommendation(recommendation);

    return NextResponse.json({
      recommendation,
      location: locationData,
    });
  } catch (error: any) {
    console.error("[Daily Routine] Error generating:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate daily routine" },
      { status: 500 }
    );
  }
}

