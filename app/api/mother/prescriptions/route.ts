import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listObjects, signedUrl, uploadFile } from "@/lib/r2Client";
import { convertPdfToImages } from "@/lib/pdfToImages";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "mother") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefix = `prescriptions/${user.id}/`;
  const items = await listObjects(prefix);
  
  // Group PDFs with their converted images
  const pdfMap = new Map<string, string[]>(); // PDF key -> array of image keys
  
  // First pass: identify PDFs and their associated images
  (items || []).forEach((obj) => {
    const key = obj.Key!;
    // Check if this is a page image (e.g., file.pdf_page1.jpg)
    const pageMatch = key.match(/^(.+)_page(\d+)\.(jpg|jpeg|png)$/i);
    if (pageMatch) {
      const pdfKey = pageMatch[1]; // The base PDF key (without _pageX.jpg)
      if (!pdfMap.has(pdfKey)) {
        pdfMap.set(pdfKey, []);
      }
      pdfMap.get(pdfKey)!.push(key);
    }
  });
  
  // Sort image keys by page number
  pdfMap.forEach((imageKeys, pdfKey) => {
    imageKeys.sort((a, b) => {
      const pageA = parseInt(a.match(/_page(\d+)\./)?.[1] || "0");
      const pageB = parseInt(b.match(/_page(\d+)\./)?.[1] || "0");
      return pageA - pageB;
    });
  });
  
  // Enrich items with imageUrls for PDFs
  const enriched = await Promise.all((items || []).map(async (obj) => {
    const key = obj.Key!;
    const url = await signedUrl(key);
    
    // Skip page images in the main list (they'll be included as imageUrls of their PDF)
    if (key.match(/_page\d+\.(jpg|jpeg|png)$/i)) {
      return null; // Filter these out
    }
    
    const result: any = {
      key,
      url,
    };
    
    // If this is a PDF, add its converted images
    if (key.endsWith('.pdf') && pdfMap.has(key)) {
      const imageKeys = pdfMap.get(key)!;
      result.imageUrls = await Promise.all(
        imageKeys.map(async (imgKey) => await signedUrl(imgKey))
      );
      result.imageKeys = imageKeys;
      result.pageCount = imageKeys.length;
      result.isPdf = true;
      console.log(`[Prescription GET] PDF ${key} has ${imageKeys.length} converted image(s)`);
    }
    
    return result;
  }));
  
  // Filter out nulls (page images)
  const filtered = enriched.filter(item => item !== null);

  return NextResponse.json({ items: filtered });
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

      console.log(`[Prescription Upload] Starting upload of ${pdfImages.length} image(s) to R2...`);
      
      for (let i = 0; i < pdfImages.length; i++) {
        const image = pdfImages[i];
        // Use .jpg extension (images are already converted to JPEG format)
        const imageKey = `${baseKey}_page${image.pageNumber}.jpg`;
        
        try {
          // Verify image buffer exists and has data
          if (!image.imageBuffer || image.imageBuffer.length === 0) {
            throw new Error(`Image buffer for page ${image.pageNumber} is empty`);
          }
          
          console.log(`[Prescription Upload] Uploading page ${image.pageNumber}/${pdfImages.length} to R2: ${imageKey} (${Math.round(image.imageBuffer.length / 1024)}KB)`);
          
          await uploadFile({
            key: imageKey,
            body: image.imageBuffer, // Already JPEG format from conversion
            contentType: "image/jpeg",
          });

          const imageUrl = await signedUrl(imageKey);
          imageUrls.push(imageUrl);
          imageKeys.push(imageKey);
          
          console.log(`[Prescription Upload] ✅ Page ${image.pageNumber}/${pdfImages.length} uploaded successfully: ${imageKey}`);
          console.log(`[Prescription Upload] Image URL: ${imageUrl.substring(0, 100)}...`);
        } catch (imageUploadError: any) {
          console.error(`[Prescription Upload] ❌ Failed to upload page ${image.pageNumber}: ${imageUploadError.message}`);
          console.error(`[Prescription Upload] Error stack:`, imageUploadError.stack);
          // Continue with other pages but log the error
        }
      }
      
      console.log(`[Prescription Upload] Upload summary: ${imageUrls.length}/${pdfImages.length} images uploaded successfully`);

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

