import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDoctor, saveDoctor, getMother, saveMother, listAdminActivities } from "@/lib/data";
import { logActivity } from "@/lib/adminActivity";

/**
 * Pause or unpause a user (doctor or mother)
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, userType, pause } = await req.json();
  
  if (!userId || !userType || typeof pause !== "boolean") {
    return NextResponse.json(
      { error: "userId, userType, and pause (boolean) are required" },
      { status: 400 }
    );
  }

  try {
    // Check if this user was last modified by super admin (editors can't change super admin decisions)
    if (user.adminType === "editor") {
      const activities = await listAdminActivities(undefined, 100);
      const lastUserActivity = activities
        .filter(a => a.targetType === userType && a.targetId === userId && (a.action.includes("pause") || a.action.includes("unpause")))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      
      // If last action was by super admin, editors cannot modify
      if (lastUserActivity && lastUserActivity.adminType === "super_admin") {
        return NextResponse.json({ 
          error: "This action was performed by super admin and cannot be modified by editors" 
        }, { status: 403 });
      }
    }
    
    if (userType === "doctor") {
      const doctor = await getDoctor(userId);
      if (!doctor) {
        return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
      }

      const previousStatus = doctor.status;
      const updated = {
        ...doctor,
        status: pause ? ("paused" as const) : ("approved" as const),
        updatedAt: new Date().toISOString(),
      };

      await saveDoctor(updated);
      
      // Log activity
      await logActivity(
        user,
        pause ? "pause_doctor" : "unpause_doctor",
        "doctor",
        userId,
        { previousStatus, newStatus: updated.status },
        req
      );
      
      // If pausing, invalidate all tokens by returning a flag to logout
      // The frontend should handle logout when pause is true
      return NextResponse.json({ 
        success: true, 
        status: updated.status,
        requiresLogout: pause // Signal that user should be logged out
      });
    } else if (userType === "mother") {
      const mother = await getMother(userId);
      if (!mother) {
        return NextResponse.json({ error: "Mother not found" }, { status: 404 });
      }

      const previousStatus = mother.status;
      const updated = {
        ...mother,
        status: pause ? ("paused" as const) : ("active" as const),
        updatedAt: new Date().toISOString(),
      };

      await saveMother(updated);
      
      // Log activity
      await logActivity(
        user,
        pause ? "pause_mother" : "unpause_mother",
        "mother",
        userId,
        { previousStatus, newStatus: updated.status },
        req
      );
      
      // If pausing, invalidate all tokens by returning a flag to logout
      return NextResponse.json({ 
        success: true, 
        status: updated.status,
        requiresLogout: pause // Signal that user should be logged out
      });
    } else {
      return NextResponse.json(
        { error: "Invalid userType. Must be 'doctor' or 'mother'" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Pause user error:", error);
    return NextResponse.json(
      { error: "Failed to update user status" },
      { status: 500 }
    );
  }
}

