import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listObjects, signedUrl, uploadFile } from "@/lib/r2Client";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "mother") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefix = `prescriptions/${user.id}/`;
  const items = await listObjects(prefix);
  const enriched =
    await Promise.all((items || []).map(async (obj) => ({
      key: obj.Key!,
      url: await signedUrl(obj.Key!),
    })));

  return NextResponse.json({ items: enriched });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload PDF, PNG, or JPG files only." },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `prescriptions/${user.id}/${uuid()}-${sanitizedName}`;

    await uploadFile({
      key,
      body: buffer,
      contentType: file.type || "application/octet-stream",
    });

    const url = await signedUrl(key);
    return NextResponse.json({ key, url });
  } catch (error: any) {
    console.error("Prescription upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload prescription. Please try again." },
      { status: 500 }
    );
  }
}

