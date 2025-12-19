import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getVectorSearchAnalytics } from "@/lib/vectorSearchAnalytics";

/**
 * GET /api/admin/vector-analytics
 * Get vector search analytics (only super admin)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super admin can view vector analytics
    if (user.adminType !== "super_admin") {
      return NextResponse.json({ error: "Only super admin can view vector analytics" }, { status: 403 });
    }

    const analytics = getVectorSearchAnalytics();
    
    return NextResponse.json({ analytics });
  } catch (error: any) {
    console.error("Error getting vector analytics:", error);
    return NextResponse.json(
      { error: "Failed to get vector analytics", message: error.message },
      { status: 500 }
    );
  }
}

