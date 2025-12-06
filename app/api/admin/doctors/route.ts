import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDoctor, listAllDoctors, saveDoctor } from "@/lib/data";
import { signedUrl } from "@/lib/r2Client";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const doctors = await listAllDoctors();
    console.log(`[Admin] Found ${doctors.length} total doctors`);
    
    const pendingDoctors = doctors.filter((d) => d.status === "pending");
    
    // Generate fresh signed URLs for profile pictures
    const pending = await Promise.all(
      pendingDoctors.map(async ({ passwordHash, profilePicture, ...rest }) => {
        let pictureUrl = profilePicture;
        if (profilePicture && !profilePicture.startsWith("http")) {
          // It's a key, generate fresh signed URL
          try {
            pictureUrl = await signedUrl(profilePicture, 86400); // 24 hours
          } catch (err) {
            console.error(`Failed to generate signed URL for profile picture key "${profilePicture}":`, err);
            // Try fallback: if key contains temp-, try the original temp path
            if (profilePicture.includes("temp-")) {
              // Already tried the key, skip fallback
            }
            pictureUrl = undefined;
          }
        }
        return { ...rest, profilePicture: pictureUrl };
      })
    );
    
    console.log(`[Admin] Found ${pending.length} pending doctors`);
    
    return NextResponse.json({ pending });
  } catch (error: any) {
    console.error("[Admin] Error fetching pending doctors:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending doctors", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { doctorId, action, comment } = await req.json();
  if (!doctorId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "doctorId and action required" }, { status: 400 });
  }
  const doctor = await getDoctor(doctorId);
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  const updated = {
    ...doctor,
    status: action === "approve" ? ("approved" as const) : ("rejected" as const),
    verificationComment: comment || undefined,
    pendingVerification: false,
    // Clear changes and previous values after admin action
    changes: undefined,
    previousValues: undefined,
    updatedAt: new Date().toISOString(),
  };
  await saveDoctor(updated);
  return NextResponse.json({ doctorId, status: updated.status });
}

