import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listObjects, signedUrl, uploadFile } from "@/lib/r2Client";
// Import polyfill first
import "@/lib/pdfPolyfill";
import { convertPdfToImages } from "@/lib/pdfToImages";
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
    const fileId = uuid();
    const baseKey = `prescriptions/${user.id}/${fileId}-${sanitizedName}`;

    // Check if file is PDF
    const isPdf = file.type === "application/pdf";

    if (isPdf) {
      // Try to convert PDF to images, but fallback to uploading PDF as-is if conversion fails
      console.log(`[Prescription Upload] Attempting to convert PDF to images: ${file.name}`);
      try {
        const pdfImages = await convertPdfToImages(buffer, 2.0);

        if (pdfImages.length === 0) {
          console.warn(`[Prescription Upload] PDF conversion returned 0 pages, uploading PDF as-is`);
          throw new Error("No pages extracted from PDF");
        }

        // Upload original PDF (optional - for reference)
        const pdfKey = `${baseKey}`;
        await uploadFile({
          key: pdfKey,
          body: buffer,
          contentType: "application/pdf",
        });

        // Upload each page as an image
        const imageUrls: string[] = [];
        const imageKeys: string[] = [];

        for (let i = 0; i < pdfImages.length; i++) {
          const image = pdfImages[i];
          const imageKey = `${baseKey}_page${image.pageNumber}.png`;
          
          await uploadFile({
            key: imageKey,
            body: image.imageBuffer,
            contentType: "image/png",
          });

          const imageUrl = await signedUrl(imageKey);
          imageUrls.push(imageUrl);
          imageKeys.push(imageKey);
        }

        console.log(`[Prescription Upload] ✅ Converted ${pdfImages.length} page(s) to images`);

        // Return the image URLs (these will be used for Groq analysis)
        // Also return the PDF key for reference
        return NextResponse.json({
          key: pdfKey,
          url: await signedUrl(pdfKey), // Original PDF URL
          imageUrls, // Array of image URLs for analysis
          imageKeys, // Array of image keys
          pageCount: pdfImages.length,
          isPdf: true,
        });
      } catch (conversionError: any) {
        console.error(`[Prescription Upload] PDF conversion failed: ${conversionError.message}`);
        console.log(`[Prescription Upload] Falling back to uploading PDF as-is`);
        // Fall through to regular PDF upload below
      }
    }
    
    // Regular file upload (for images or PDFs that failed conversion)
    const key = baseKey;
    await uploadFile({
      key,
      body: buffer,
      contentType: file.type || "application/octet-stream",
    });

    const url = await signedUrl(key);
    return NextResponse.json({ 
      key, 
      url, 
      isPdf: isPdf,
      note: isPdf ? "PDF uploaded as-is (conversion unavailable)" : undefined
    });
  } catch (error: any) {
    console.error("Prescription upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload prescription. Please try again." },
      { status: 500 }
    );
  }
}

