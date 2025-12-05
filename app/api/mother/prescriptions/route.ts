import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listObjects, signedUrl, uploadFile } from "@/lib/r2Client";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
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
  const user = getUserFromRequest(req);
  if (!user || user.role !== "mother") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const key = `prescriptions/${user.id}/${uuid()}-${file.name}`;

  await uploadFile({
    key,
    body: buffer,
    contentType: file.type || "application/octet-stream",
  });

  return NextResponse.json({ key, url: await signedUrl(key) });
}

