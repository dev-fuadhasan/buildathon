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
    const limit = parseInt(searchParams.get("limit") || "500", 10);
    const adminId = searchParams.get("adminId"); // For super admin to filter by specific admin/editor
    
    // Super admin can see all activities (including their own) or filter by adminId
    // Editors can only see their own activities
    let filterAdminId: string | undefined;
    if (user.adminType === "super_admin") {
      // If adminId is provided, filter by that specific admin/editor
      // Otherwise, show all activities (including super admin)
      filterAdminId = adminId || undefined;
    } else {
      // Editors only see their own activities
      filterAdminId = user.id;
    }
    
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

