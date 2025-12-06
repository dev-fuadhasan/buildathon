import { NextRequest, NextResponse } from "next/server";
import { uploadFile, signedUrl } from "@/lib/r2Client";
import { v4 as uuid } from "uuid";

/**
 * This endpoint allows uploading profile pictures during doctor registration
 * without requiring authentication. The file is uploaded temporarily and
 * the URL is returned to be included in the registration data.
 */
export async function POST(req: NextRequest) {
  try {
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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    // Store directly in doctor's folder structure - will be moved to final location after registration
    // Use a temporary ID that will be replaced with actual doctor ID after registration
    const tempId = `temp-${uuid()}`;
    const key = `doctors/${tempId}/profile-${uuid()}-${sanitizedName}`;

    await uploadFile({
      key,
      body: buffer,
      contentType: file.type || "image/jpeg",
    });

    const url = await signedUrl(key);

    return NextResponse.json({ url, key });
  } catch (error: any) {
    console.error("Profile picture upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload profile picture. Please try again." },
      { status: 500 }
    );
  }
}

