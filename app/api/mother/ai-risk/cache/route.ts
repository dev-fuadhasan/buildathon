import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getCachedAIRisks } from "@/lib/dismissedRisksDB";

// GET: Load cached AI-generated risks for a specific text hash
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const textHash = searchParams.get("hash");

    if (!textHash) {
      return NextResponse.json({ error: "Missing text hash" }, { status: 400 });
    }

    const risks = await getCachedAIRisks(user.id, textHash);

    return NextResponse.json(
      {
        risks: risks || [],
        cached: risks !== null,
        timestamp: Date.now(),
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
    console.error("[AI Risk Cache] Error loading cached risks:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load cached risks", risks: [] },
      { status: 500 }
    );
  }
}
