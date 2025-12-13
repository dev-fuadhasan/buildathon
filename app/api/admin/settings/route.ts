import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getAdminSettings, saveAdminSettings } from "@/lib/data";
import { logActivity } from "@/lib/adminActivity";

/**
 * GET /api/admin/settings
 * Get admin settings (only super admin)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super admin can view settings
    if (user.adminType !== "super_admin") {
      return NextResponse.json({ error: "Only super admin can view settings" }, { status: 403 });
    }

    const settings = await getAdminSettings();
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("Error getting admin settings:", error);
    return NextResponse.json(
      { error: "Failed to get settings", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings
 * Update admin settings (only super admin)
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super admin can update settings
    if (user.adminType !== "super_admin") {
      return NextResponse.json({ error: "Only super admin can update settings" }, { status: 403 });
    }

    const body = await req.json();
    const {
      morningRecommendationHour,
      morningRecommendationMinute,
      eveningRecommendationHour,
      eveningRecommendationMinute,
      questionHour,
      questionMinute,
      questionsPerDay,
    } = body;

    // Validate inputs
    if (morningRecommendationHour !== undefined && (morningRecommendationHour < 0 || morningRecommendationHour > 23)) {
      return NextResponse.json(
        { error: "Morning recommendation hour must be between 0 and 23" },
        { status: 400 }
      );
    }

    if (morningRecommendationMinute !== undefined && (morningRecommendationMinute < 0 || morningRecommendationMinute > 59)) {
      return NextResponse.json(
        { error: "Morning recommendation minute must be between 0 and 59" },
        { status: 400 }
      );
    }

    if (eveningRecommendationHour !== undefined && (eveningRecommendationHour < 0 || eveningRecommendationHour > 23)) {
      return NextResponse.json(
        { error: "Evening recommendation hour must be between 0 and 23" },
        { status: 400 }
      );
    }

    if (eveningRecommendationMinute !== undefined && (eveningRecommendationMinute < 0 || eveningRecommendationMinute > 59)) {
      return NextResponse.json(
        { error: "Evening recommendation minute must be between 0 and 59" },
        { status: 400 }
      );
    }

    if (questionHour !== undefined && (questionHour < 0 || questionHour > 23)) {
      return NextResponse.json(
        { error: "Question hour must be between 0 and 23" },
        { status: 400 }
      );
    }

    if (questionMinute !== undefined && (questionMinute < 0 || questionMinute > 59)) {
      return NextResponse.json(
        { error: "Question minute must be between 0 and 59" },
        { status: 400 }
      );
    }

    if (questionsPerDay !== undefined && (questionsPerDay < 1 || questionsPerDay > 50)) {
      return NextResponse.json(
        { error: "Questions per day must be between 1 and 50" },
        { status: 400 }
      );
    }

    // Get current settings
    const currentSettings = await getAdminSettings();

    // Update settings
    const updatedSettings = {
      ...currentSettings,
      morningRecommendationHour: morningRecommendationHour ?? currentSettings.morningRecommendationHour,
      morningRecommendationMinute: morningRecommendationMinute ?? (currentSettings.morningRecommendationMinute ?? 0),
      eveningRecommendationHour: eveningRecommendationHour ?? currentSettings.eveningRecommendationHour,
      eveningRecommendationMinute: eveningRecommendationMinute ?? (currentSettings.eveningRecommendationMinute ?? 0),
      questionHour: questionHour ?? currentSettings.questionHour,
      questionMinute: questionMinute ?? (currentSettings.questionMinute ?? 0),
      questionsPerDay: questionsPerDay ?? currentSettings.questionsPerDay,
      updatedAt: new Date().toISOString(),
      updatedBy: user.email,
    };

    await saveAdminSettings(updatedSettings);

    // Log activity
    await logActivity(
      user,
      "update_settings",
      "system",
      "admin-settings",
      {
        changes: {
          morningRecommendationTime: (updatedSettings.morningRecommendationHour !== currentSettings.morningRecommendationHour || 
            updatedSettings.morningRecommendationMinute !== (currentSettings.morningRecommendationMinute ?? 0))
            ? { 
                from: `${currentSettings.morningRecommendationHour}:${String(currentSettings.morningRecommendationMinute ?? 0).padStart(2, '0')}`, 
                to: `${updatedSettings.morningRecommendationHour}:${String(updatedSettings.morningRecommendationMinute).padStart(2, '0')}` 
              }
            : undefined,
          eveningRecommendationTime: (updatedSettings.eveningRecommendationHour !== currentSettings.eveningRecommendationHour || 
            updatedSettings.eveningRecommendationMinute !== (currentSettings.eveningRecommendationMinute ?? 0))
            ? { 
                from: `${currentSettings.eveningRecommendationHour}:${String(currentSettings.eveningRecommendationMinute ?? 0).padStart(2, '0')}`, 
                to: `${updatedSettings.eveningRecommendationHour}:${String(updatedSettings.eveningRecommendationMinute).padStart(2, '0')}` 
              }
            : undefined,
          questionTime: (updatedSettings.questionHour !== currentSettings.questionHour || 
            updatedSettings.questionMinute !== (currentSettings.questionMinute ?? 0))
            ? { 
                from: `${currentSettings.questionHour}:${String(currentSettings.questionMinute ?? 0).padStart(2, '0')}`, 
                to: `${updatedSettings.questionHour}:${String(updatedSettings.questionMinute).padStart(2, '0')}` 
              }
            : undefined,
          questionsPerDay: updatedSettings.questionsPerDay !== currentSettings.questionsPerDay
            ? { from: currentSettings.questionsPerDay, to: updatedSettings.questionsPerDay }
            : undefined,
        },
      },
      req
    );

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    });
  } catch (error: any) {
    console.error("Error updating admin settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings", message: error.message },
      { status: 500 }
    );
  }
}

