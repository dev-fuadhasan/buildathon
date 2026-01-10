import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { 
  getFoodRecommendation, 
  saveFoodRecommendation, 
  listFoodRecommendations,
  getMother,
  getChatHistory
} from "@/lib/data";
import { generateDailyRoutineRecommendations } from "@/lib/foodRecommendationAI";
import { getCurrentDateInTimezone } from "@/lib/pregnancyTracker";
import { getClientIP, detectTimezoneFromIP } from "@/lib/timezoneDetector";
import { listDailyEntries } from "@/lib/data";
import { listObjects, signedUrl } from "@/lib/r2Client";
import { v4 as uuid } from "uuid";

/**
 * GET: Get food recommendations for a specific date (defaults to today)
 * If no recommendation exists for today, generates a new one
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

    // Detect timezone
    const ip = getClientIP(req);
    const timezone = await detectTimezoneFromIP(ip, mother.address);
    const today = getCurrentDateInTimezone(timezone);

    // Get date from query params (defaults to today)
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || today;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Try to get existing recommendation
    let recommendation = await getFoodRecommendation(user.id, date);

    // If no recommendation exists and it's today, generate one
    if (!recommendation && date === today) {
      // Get daily entries for context
      const dailyEntries = await listDailyEntries(user.id);
      
      // Get past recommendations for variety
      const pastRecommendations = await listFoodRecommendations(user.id);
      
      // Get chat history
      const chatHistory = await getChatHistory(user.id);
      
      // Get prescriptions
      let prescriptionUrls: string[] = [];
      try {
        const prefix = `prescriptions/${user.id}/`;
        const objects = await listObjects(prefix);
        prescriptionUrls = await Promise.all(
          (objects || []).slice(0, 5).map(async (obj) => await signedUrl(obj.Key!))
        );
      } catch (err) {
        console.error("Error fetching prescriptions:", err);
      }
      
      // Generate new recommendations
      const routineData = await generateDailyRoutineRecommendations(
        mother,
        dailyEntries,
        pastRecommendations,
        prescriptionUrls,
        chatHistory?.messages
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
        breakfastEaten: false,
        lunchEaten: false,
        dinnerEaten: false,
        exercisesDone: false,
        createdAt: now,
        updatedAt: now,
      };

      await saveFoodRecommendation(recommendation);
    }

    if (!recommendation) {
      return NextResponse.json(
        { error: "No recommendation found for this date" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, recommendation });
  } catch (error: any) {
    console.error("Food recommendations GET error:", error);
    return NextResponse.json(
      { error: "Failed to get food recommendations" },
      { status: 500 }
    );
  }
}

/**
 * POST: Generate new food recommendations for today
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

    // Detect timezone
    const ip = getClientIP(req);
    const timezone = await detectTimezoneFromIP(ip, mother.address);
    const today = getCurrentDateInTimezone(timezone);

    // Get daily entries for context
    const dailyEntries = await listDailyEntries(user.id);
    
    // Get past recommendations for variety
    const pastRecommendations = await listFoodRecommendations(user.id);
    
    // Get chat history
    const chatHistory = await getChatHistory(user.id);
    
    // Get prescriptions
    let prescriptionUrls: string[] = [];
    try {
      const prefix = `prescriptions/${user.id}/`;
      const objects = await listObjects(prefix);
      prescriptionUrls = await Promise.all(
        (objects || []).slice(0, 5).map(async (obj) => await signedUrl(obj.Key!))
      );
    } catch (err) {
      console.error("Error fetching prescriptions:", err);
    }
    
    // Generate new recommendations
    const routineData = await generateDailyRoutineRecommendations(
      mother,
      dailyEntries,
      pastRecommendations,
      prescriptionUrls,
      chatHistory?.messages
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
      breakfastEaten: existing?.breakfastEaten || false,
      lunchEaten: existing?.lunchEaten || false,
      dinnerEaten: existing?.dinnerEaten || false,
      exercisesDone: existing?.exercisesDone || false,
      breakfastEatenAt: existing?.breakfastEatenAt,
      lunchEatenAt: existing?.lunchEatenAt,
      dinnerEatenAt: existing?.dinnerEatenAt,
      exercisesDoneAt: existing?.exercisesDoneAt,
      dailyReport: existing?.dailyReport,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await saveFoodRecommendation(recommendation);

    return NextResponse.json({ success: true, recommendation });
  } catch (error: any) {
    console.error("Food recommendations POST error:", error);
    return NextResponse.json(
      { error: "Failed to generate food recommendations" },
      { status: 500 }
    );
  }
}

