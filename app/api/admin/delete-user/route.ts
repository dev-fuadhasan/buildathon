import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { deleteDoctor, getMother, deleteMother, listAdminActivities } from "@/lib/data";
import { logActivity } from "@/lib/adminActivity";

/**
 * Delete a user (doctor or mother)
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, userType } = await req.json();
  
  if (!userId || !userType) {
    return NextResponse.json(
      { error: "userId and userType are required" },
      { status: 400 }
    );
  }

  // Only super admin can delete users
  if (user.adminType !== "super_admin") {
    return NextResponse.json({ 
      error: "Only super admin can delete users" 
    }, { status: 403 });
  }

  try {
    if (userType === "doctor") {
      await deleteDoctor(userId);
      
      // Log activity
      await logActivity(
        user,
        "delete_doctor",
        "doctor",
        userId,
        { deletedAt: new Date().toISOString() },
        req
      );
      
      return NextResponse.json({ success: true });
    } else if (userType === "mother") {
      const mother = await getMother(userId);
      if (!mother) {
        return NextResponse.json({ error: "Mother not found" }, { status: 404 });
      }
      await deleteMother(userId);
      
      // Log activity
      await logActivity(
        user,
        "delete_mother",
        "mother",
        userId,
        { deletedAt: new Date().toISOString() },
        req
      );
      
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Invalid userType. Must be 'doctor' or 'mother'" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

