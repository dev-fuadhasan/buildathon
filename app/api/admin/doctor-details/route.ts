import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDoctor } from "@/lib/data";
import { signedUrl } from "@/lib/r2Client";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get("id");
  
  if (!doctorId) {
    return NextResponse.json({ error: "Doctor ID required" }, { status: 400 });
  }

  const doctor = await getDoctor(doctorId);
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const { passwordHash, ...safe } = doctor;
  
  // Generate fresh signed URL for profile picture if it exists
  if (safe.profilePicture && !safe.profilePicture.startsWith("http")) {
    // It's a key, generate fresh signed URL
    try {
      safe.profilePicture = await signedUrl(safe.profilePicture, 86400); // 24 hours
    } catch (err) {
      console.error(`Failed to generate signed URL for profile picture key "${safe.profilePicture}":`, err);
      // If the key doesn't work, try to find the file in temp location as fallback
      if (safe.profilePicture.includes(doctor.id)) {
        // Key already contains doctor ID, so it's the final location - file might not exist
        safe.profilePicture = undefined;
      } else if (safe.profilePicture.includes("temp-")) {
        // Try the temp location
        try {
          safe.profilePicture = await signedUrl(safe.profilePicture, 86400);
        } catch (fallbackErr) {
          console.error("Fallback temp location also failed:", fallbackErr);
          safe.profilePicture = undefined;
        }
      } else {
        safe.profilePicture = undefined;
      }
    }
  }
  
  return NextResponse.json({ doctor: safe });
}

