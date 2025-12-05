import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { deleteObject } from "@/lib/r2Client";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const key = decodeURIComponent(params.key);
    
    // Verify the prescription belongs to this mother
    if (!key.startsWith(`prescriptions/${user.id}/`)) {
      return NextResponse.json(
        { error: "You can only delete your own prescriptions" },
        { status: 403 }
      );
    }

    await deleteObject(key);
    return NextResponse.json({ success: true, message: "Prescription deleted successfully" });
  } catch (error: any) {
    console.error("Prescription delete error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete prescription. Please try again." },
      { status: 500 }
    );
  }
}

