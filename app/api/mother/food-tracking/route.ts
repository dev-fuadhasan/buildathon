import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { 
  getFoodRecommendation, 
  saveFoodRecommendation,
  getMother 
} from "@/lib/data";
import { getCurrentDateInTimezone } from "@/lib/pregnancyTracker";
import { getClientIP, detectTimezoneFromIP } from "@/lib/timezoneDetector";
import { v4 as uuid } from "uuid";

/**
 * PUT: Mark food as eaten/not eaten
 * Body: { meal: "breakfast" | "lunch" | "dinner", eaten: boolean, date?: string }
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mother = await getMother(user.id);
    if (!mother) {
      return NextResponse.json({ error: "Mother not found" }, { status: 404 });
    }

    const body = await req.json();
    const { meal, eaten, date } = body;

    if (!meal || typeof eaten !== "boolean") {
      return NextResponse.json(
        { error: "meal (breakfast/lunch/dinner) and eaten (boolean) are required" },
        { status: 400 }
      );
    }

    if (!["breakfast", "lunch", "dinner"].includes(meal)) {
      return NextResponse.json(
        { error: "meal must be 'breakfast', 'lunch', or 'dinner'" },
        { status: 400 }
      );
    }

    // Detect timezone
    const ip = getClientIP(req);
    const timezone = await detectTimezoneFromIP(ip, mother.address);
    const today = getCurrentDateInTimezone(timezone);
    const targetDate = date || today;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Get existing recommendation or create new one
    let recommendation = await getFoodRecommendation(user.id, targetDate);

    if (!recommendation) {
      // If no recommendation exists, return error (should generate recommendation first)
      return NextResponse.json(
        { error: "No food recommendation found for this date. Please generate recommendations first." },
        { status: 404 }
      );
    }

    // Update the meal tracking
    const now = new Date().toISOString();
    const mealKey = `${meal}Eaten` as "breakfastEaten" | "lunchEaten" | "dinnerEaten";
    const mealTimeKey = `${meal}EatenAt` as "breakfastEatenAt" | "lunchEatenAt" | "dinnerEatenAt";

    recommendation = {
      ...recommendation,
      [mealKey]: eaten,
      [mealTimeKey]: eaten ? now : undefined,
      updatedAt: now,
    };

    await saveFoodRecommendation(recommendation);

    return NextResponse.json({ success: true, recommendation });
  } catch (error: any) {
    console.error("Food tracking PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update food tracking" },
      { status: 500 }
    );
  }
}

