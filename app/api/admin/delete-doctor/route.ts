import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { deleteDoctor } from "@/lib/data";
import { logActivity } from "@/lib/adminActivity";

export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only super admin can delete doctors
  if (user.adminType !== "super_admin") {
    return NextResponse.json({ 
      error: "Only super admin can delete doctors" 
    }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get("id");
  
  if (!doctorId) {
    return NextResponse.json({ error: "Doctor ID required" }, { status: 400 });
  }

  try {
    await deleteDoctor(doctorId);
    
    // Log activity
    await logActivity(
      user,
      "delete_doctor",
      "doctor",
      doctorId,
      { deletedAt: new Date().toISOString() },
      req
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete doctor" },
      { status: 500 }
    );
  }
}

