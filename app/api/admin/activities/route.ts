import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listAdminActivities } from "@/lib/data";

/**
 * Get admin activity logs
 * Super admin can see all activities
 * Editors can only see their own activities
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const adminId = searchParams.get("adminId"); // For super admin to filter by editor
    
    // Super admin can see all activities or filter by adminId
    // Editors can only see their own activities
    const filterAdminId = user.adminType === "super_admin" 
      ? (adminId || undefined)
      : user.id; // Editors only see their own
    
    const activities = await listAdminActivities(filterAdminId, limit);
    
    return NextResponse.json({ activities });
  } catch (error: any) {
    console.error("Error fetching admin activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

