import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDismissedRisksDB, saveAllDismissedRisksDB } from "@/lib/dismissedRisksDB";

// GET: Load dismissed risk factors (SUPABASE - STRONG CONSISTENCY)
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dismissedRiskFactors = await getDismissedRisksDB(user.id);

    return NextResponse.json(
      {
        dismissedRiskFactors,
        timestamp: Date.now(),
        source: "supabase", // For debugging
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error: any) {
    console.error("[API] Error loading dismissed risks:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load dismissed risks" },
      { status: 500 }
    );
  }
}

// POST: Save dismissed risk factors (SUPABASE - STRONG CONSISTENCY)
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { dismissedRiskFactors } = body;

    if (!dismissedRiskFactors || typeof dismissedRiskFactors !== "object") {
      return NextResponse.json(
        { error: "Invalid dismissed risk factors data" },
        { status: 400 }
      );
    }

    console.log("[API] Saving dismissed risks:", {
      motherId: user.id,
      count: Object.keys(dismissedRiskFactors).length,
      keys: Object.keys(dismissedRiskFactors),
    });

    await saveAllDismissedRisksDB(user.id, dismissedRiskFactors);

    return NextResponse.json(
      {
        success: true,
        dismissedRiskFactors,
        timestamp: Date.now(),
        source: "supabase", // For debugging
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error: any) {
    console.error("[API] Error saving dismissed risks:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save dismissed risks" },
      { status: 500 }
    );
  }
}
