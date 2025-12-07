import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listAdminActivities } from "@/lib/data";
import { logActivity } from "@/lib/adminActivity";

/**
 * Get list of editors (only for super admin)
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin" || user.adminType !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all activities to determine editor status
    const activities = await listAdminActivities(undefined, 1000);
    
    // Get unique editors from activities
    const editorIds = new Set<string>();
    const editorEmails = new Map<string, string>();
    
    activities.forEach(activity => {
      if (activity.adminType === "editor") {
        editorIds.add(activity.adminId);
        editorEmails.set(activity.adminId, activity.adminEmail);
      }
    });
    
    // Get editor info and their last activity
    const editors = Array.from(editorIds).map(editorId => {
      const editorActivities = activities.filter(a => a.adminId === editorId);
      const lastActivity = editorActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
      
      // Check if editor is paused (we'll need to store this in a separate file or use activities)
      // For now, we'll check if there's a "pause_editor" activity
      const pauseActivity = editorActivities.find(a => a.action === "pause_editor");
      const isPaused = !!pauseActivity && 
        (!editorActivities.find(a => a.action === "unpause_editor" && new Date(a.timestamp) > new Date(pauseActivity.timestamp)));
      
      return {
        id: editorId,
        email: editorEmails.get(editorId) || "Unknown",
        lastActivity: lastActivity?.timestamp,
        isPaused,
        totalActivities: editorActivities.length,
      };
    });
    
    return NextResponse.json({ editors });
  } catch (error: any) {
    console.error("Error fetching editors:", error);
    return NextResponse.json(
      { error: "Failed to fetch editors" },
      { status: 500 }
    );
  }
}

/**
 * Pause or delete an editor (only for super admin)
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin" || user.adminType !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { editorId, action } = await req.json();
    
    if (!editorId || !["pause", "unpause", "delete"].includes(action)) {
      return NextResponse.json(
        { error: "editorId and action (pause/unpause/delete) are required" },
        { status: 400 }
      );
    }

    // Log the action
    await logActivity(
      user,
      action === "delete" ? "delete_editor" : `${action}_editor`,
      "editor",
      editorId,
      { action, timestamp: new Date().toISOString() },
      req
    );

    // For pause/unpause, we're just logging it - the actual enforcement would need
    // to check these logs during login. For delete, we're just logging it.
    // In a real system, you'd store editor status in a database.
    
    return NextResponse.json({ 
      success: true, 
      message: `Editor ${action} action logged successfully` 
    });
  } catch (error: any) {
    console.error("Error managing editor:", error);
    return NextResponse.json(
      { error: "Failed to manage editor" },
      { status: 500 }
    );
  }
}

