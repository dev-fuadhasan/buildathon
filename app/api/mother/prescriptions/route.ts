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
      // PDF conversion is REQUIRED - convert to images for AI analysis
      console.log(`[Prescription Upload] Converting PDF to images: ${file.name} (${Math.round(buffer.length / 1024)}KB)`);
      
      let pdfImages;
      try {
        pdfImages = await convertPdfToImages(buffer, 2.0);
        
        if (!pdfImages || pdfImages.length === 0) {
          throw new Error("PDF conversion returned 0 pages - conversion failed");
        }
        
        console.log(`[Prescription Upload] ✅ PDF conversion successful: ${pdfImages.length} page(s) extracted`);
      } catch (conversionError: any) {
        console.error(`[Prescription Upload] ❌ PDF conversion FAILED: ${conversionError.message}`);
        console.error(`[Prescription Upload] Error stack:`, conversionError.stack);
        return NextResponse.json(
          { 
            error: `PDF conversion failed: ${conversionError.message}. Please try uploading as images (PNG/JPG) instead, or contact support.`,
            details: conversionError.message
          },
          { status: 500 }
        );
      }

      // Upload original PDF (for reference/download)
      const pdfKey = `${baseKey}`;
      try {
        await uploadFile({
          key: pdfKey,
          body: buffer,
          contentType: "application/pdf",
        });
        console.log(`[Prescription Upload] ✅ Original PDF uploaded: ${pdfKey}`);
      } catch (pdfUploadError: any) {
        console.error(`[Prescription Upload] ⚠️ Failed to upload original PDF: ${pdfUploadError.message}`);
        // Continue with image uploads even if PDF upload fails
      }

      // Upload each page as an image - THIS IS CRITICAL FOR AI ANALYSIS
      const imageUrls: string[] = [];
      const imageKeys: string[] = [];

      for (let i = 0; i < pdfImages.length; i++) {
        const image = pdfImages[i];
        // Use .jpg extension (images are already converted to JPEG format)
        const imageKey = `${baseKey}_page${image.pageNumber}.jpg`;
        
        try {
          await uploadFile({
            key: imageKey,
            body: image.imageBuffer, // Already JPEG format from conversion
            contentType: "image/jpeg",
          });

          const imageUrl = await signedUrl(imageKey);
          imageUrls.push(imageUrl);
          imageKeys.push(imageKey);
          
          console.log(`[Prescription Upload] ✅ Page ${image.pageNumber}/${pdfImages.length} uploaded as image: ${imageKey} (${Math.round(image.imageBuffer.length / 1024)}KB)`);
        } catch (imageUploadError: any) {
          console.error(`[Prescription Upload] ❌ Failed to upload page ${image.pageNumber}: ${imageUploadError.message}`);
          // Continue with other pages
        }
      }

      if (imageUrls.length === 0) {
        return NextResponse.json(
          { error: "Failed to upload any converted images. Please try again or contact support." },
          { status: 500 }
        );
      }

      console.log(`[Prescription Upload] ✅ Successfully uploaded ${imageUrls.length} image(s) from PDF`);

      // Return the image URLs (these will be used for Groq analysis)
      // Also return the PDF key for reference
      return NextResponse.json({
        key: pdfKey,
        url: await signedUrl(pdfKey), // Original PDF URL
        imageUrls, // Array of image URLs for analysis - CRITICAL
        imageKeys, // Array of image keys - CRITICAL
        pageCount: pdfImages.length,
        imagesUploaded: imageUrls.length,
        isPdf: true,
        success: true,
      });
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

