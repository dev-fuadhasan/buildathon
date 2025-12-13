import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listAdminActivities, listAllEditors, getEditor, saveEditor } from "@/lib/data";
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
    // Get all stored editors
    const storedEditors = await listAllEditors();
    
    // Get all activities to determine editor activity status
    const activities = await listAdminActivities(undefined, 1000);
    
    // Create a map of editor info from stored editors
    const editorMap = new Map<string, {
      id: string;
      email: string;
      name?: string;
      status: "active" | "paused" | "deleted";
      createdAt: string;
      lastActivity?: string;
      isPaused: boolean;
      totalActivities: number;
    }>();
    
    // Initialize with stored editors
    storedEditors.forEach(editor => {
      editorMap.set(editor.id, {
        id: editor.id,
        email: editor.email,
        name: editor.name,
        status: editor.status,
        createdAt: editor.createdAt,
        isPaused: editor.status === "paused",
        totalActivities: 0,
      });
    });
    
    // Also include legacy editors from activities (for backward compatibility)
    activities.forEach(activity => {
      if (activity.adminType === "editor") {
        if (!editorMap.has(activity.adminId)) {
          editorMap.set(activity.adminId, {
            id: activity.adminId,
            email: activity.adminEmail,
            status: "active",
            createdAt: activity.timestamp,
            isPaused: false,
            totalActivities: 0,
          });
        }
      }
    });
    
    // Update editor info with activity data
    activities.forEach(activity => {
      if (activity.adminType === "editor" && editorMap.has(activity.adminId)) {
        const editor = editorMap.get(activity.adminId)!;
        editor.totalActivities++;
        
        // Update last activity
        if (!editor.lastActivity || new Date(activity.timestamp) > new Date(editor.lastActivity)) {
          editor.lastActivity = activity.timestamp;
        }
        
        // Check pause status from activities (for legacy editors)
        if (activity.action === "pause_editor") {
          const unpauseActivity = activities.find(a => 
            a.adminId === activity.adminId &&
            a.action === "unpause_editor" && 
            new Date(a.timestamp) > new Date(activity.timestamp)
          );
          if (!unpauseActivity) {
            editor.isPaused = true;
          }
        }
      }
    });
    
    const editors = Array.from(editorMap.values());
    
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
 * Pause, unpause, or delete an editor (only for super admin)
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

    // Check if this is a stored editor (not legacy)
    const storedEditor = await getEditor(editorId);
    
    if (storedEditor) {
      // Update stored editor status
      const now = new Date().toISOString();
      if (action === "delete") {
        storedEditor.status = "deleted";
      } else if (action === "pause") {
        storedEditor.status = "paused";
      } else if (action === "unpause") {
        storedEditor.status = "active";
      }
      storedEditor.updatedAt = now;
      
      await saveEditor(storedEditor);
    }

    // Log the action
    await logActivity(
      user,
      action === "delete" ? "delete_editor" : `${action}_editor`,
      "editor",
      editorId,
      { 
        action, 
        timestamp: new Date().toISOString(),
        editorEmail: storedEditor?.email || "Unknown"
      },
      req
    );
    
    return NextResponse.json({ 
      success: true, 
      message: `Editor ${action} action completed successfully` 
    });
  } catch (error: any) {
    console.error("Error managing editor:", error);
    return NextResponse.json(
      { error: "Failed to manage editor" },
      { status: 500 }
    );
  }
}

