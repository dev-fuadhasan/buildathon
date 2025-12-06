import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDoctor, saveDoctor } from "@/lib/data";
import { uploadFile, signedUrl } from "@/lib/r2Client";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Validate file type (images only)
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload PNG, JPG, or WEBP images only." },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    const doctor = await getDoctor(user.id);
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `doctors/${user.id}/profile-${uuid()}-${sanitizedName}`;

    await uploadFile({
      key,
      body: buffer,
      contentType: file.type || "image/jpeg",
    });

    // Store the key (not the signed URL) so we can generate fresh URLs on-demand
    const url = await signedUrl(key, 86400); // 24 hours for immediate use

    // Update doctor profile with the key (not the signed URL)
    const updated = {
      ...doctor,
      profilePicture: key, // Store key instead of signed URL
      updatedAt: new Date().toISOString(),
    };

    await saveDoctor(updated);

    return NextResponse.json({ url, key });
  } catch (error: any) {
    console.error("Profile picture upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload profile picture. Please try again." },
      { status: 500 }
    );
  }
}

