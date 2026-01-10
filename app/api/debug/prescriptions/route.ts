import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listObjects, signedUrl } from "@/lib/r2Client";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prefix = `prescriptions/${user.id}/`;
    const objects = await listObjects(prefix);

    const allObjects = (objects || []).map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      type: obj.Key?.endsWith('.pdf') ? 'PDF' : 
            obj.Key?.match(/\.(jpg|jpeg|png)$/i) ? 'IMAGE' : 
            obj.Key?.includes('metadata') ? 'METADATA' : 'OTHER'
    }));

    const imageObjects = allObjects.filter(obj => 
      obj.key && (
        obj.key.endsWith('.png') || 
        obj.key.endsWith('.jpg') || 
        obj.key.endsWith('.jpeg') ||
        obj.key.endsWith('.PNG') ||
        obj.key.endsWith('.JPG') ||
        obj.key.endsWith('.JPEG')
      ) && !obj.key.includes('metadata.json')
    );

    // Generate signed URLs for first 5 images
    const imageUrls = await Promise.all(
      imageObjects.slice(0, 5).map(async (obj) => {
        try {
          const url = await signedUrl(obj.key!);
          return {
            key: obj.key,
            url: url,
            accessible: true
          };
        } catch (error: any) {
          return {
            key: obj.key,
            url: null,
            accessible: false,
            error: error.message
          };
        }
      })
    );

    return NextResponse.json({
      userId: user.id,
      prefix,
      totalObjects: allObjects.length,
      imageCount: imageObjects.length,
      allObjects: allObjects,
      imageObjects: imageObjects,
      imageUrls: imageUrls,
      summary: {
        pdfs: allObjects.filter(o => o.type === 'PDF').length,
        images: imageObjects.length,
        metadata: allObjects.filter(o => o.type === 'METADATA').length,
        other: allObjects.filter(o => o.type === 'OTHER').length
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

