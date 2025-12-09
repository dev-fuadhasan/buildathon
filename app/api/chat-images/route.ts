import { NextRequest, NextResponse } from "next/server";
import { uploadFile, signedUrl } from "@/lib/r2Client";
import crypto from "crypto";

// For logged-out users (guest) - temporary image storage
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PNG, JPG, and WEBP images are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (5MB max for images)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    // Generate unique filename for guest images
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString("hex");
    const ext = file.name.split(".").pop();
    const filename = `guest_${timestamp}_${randomId}.${ext}`;

    // Upload to R2 in temporary guest folder
    const key = `chat-images/guest/${filename}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile({
      key,
      body: buffer,
      contentType: file.type,
    });

    // Get signed URL
    const url = await signedUrl(key);

    return NextResponse.json({
      success: true,
      url,
      key,
    });
  } catch (error: any) {
    console.error("Guest image upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}

