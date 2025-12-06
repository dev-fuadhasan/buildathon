import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listAllDoctors } from "@/lib/data";
import { signedUrl } from "@/lib/r2Client";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doctors = await listAllDoctors();
  const safe = await Promise.all(
    doctors.map(async ({ passwordHash, profilePicture, ...rest }) => {
      // Generate fresh signed URL for profile picture if it exists
      let pictureUrl = profilePicture;
      if (profilePicture && !profilePicture.startsWith("http")) {
        // It's a key, generate fresh signed URL
        try {
          pictureUrl = await signedUrl(profilePicture, 86400); // 24 hours
        } catch (err) {
          console.error("Failed to generate signed URL for profile picture:", err);
          pictureUrl = undefined;
        }
      }
      return { ...rest, profilePicture: pictureUrl };
    })
  );
  
  return NextResponse.json({ doctors: safe });
}

