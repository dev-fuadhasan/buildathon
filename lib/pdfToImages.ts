import ConvertAPI from "convertapi";

export interface PDFPageImage {
  pageNumber: number;
  imageBuffer: Buffer;
  width: number;
  height: number;
}

// Initialize ConvertAPI with API key
// API key from user: IvxUIykBrZbhueFJGiIJHcrDZjoitxby
const convertApi = new ConvertAPI(process.env.CONVERTAPI_SECRET || "IvxUIykBrZbhueFJGiIJHcrDZjoitxby");

/**
 * Convert a PDF buffer to an array of image buffers (one per page)
 * Uses ConvertAPI service - reliable, no worker issues, works in serverless
 * @param pdfBuffer - The PDF file as a Buffer
 * @param scale - Scale factor for image quality (default: 2.0 for good quality)
 * @returns Array of image buffers with metadata
 */
export async function convertPdfToImages(
  pdfBuffer: Buffer,
  scale: number = 2.0
): Promise<PDFPageImage[]> {
  try {
    console.log(`[PDF Conversion] Starting conversion with ConvertAPI...`);
    console.log(`[PDF Conversion] PDF size: ${Math.round(pdfBuffer.length / 1024)}KB`);
    
    // ConvertAPI needs a file, so write to temp file first
    const fs = await import("fs/promises");
    const path = await import("path");
    const os = await import("os");
    
    const tempDir = os.tmpdir();
    const tempPdfPath = path.join(tempDir, `pdf_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
    
    try {
      // Write PDF buffer to temp file
      await fs.writeFile(tempPdfPath, pdfBuffer);
      console.log(`[PDF Conversion] PDF written to temp file: ${tempPdfPath}`);
      
      // Set quality/density based on scale (scale 2.0 = 200 DPI)
      const dpi = Math.round(scale * 100); // scale 2.0 = 200 DPI
      
      console.log(`[PDF Conversion] Converting PDF to JPG with DPI: ${dpi}...`);
      
      // Convert PDF to JPG using ConvertAPI
      // ConvertAPI format: convert(toFormat, params, fromFormat?)
      // For PDF to JPG: convert('jpg', { File: path }, 'pdf')
      const result = await convertApi.convert("jpg", {
        File: tempPdfPath,
        ImageQuality: 90, // JPEG quality (0-100)
        Density: dpi, // DPI for conversion
      }, "pdf");
      
      console.log(`[PDF Conversion] ConvertAPI conversion successful`);
      console.log(`[PDF Conversion] Result files: ${result.files?.length || 0}`);
      
      const images: PDFPageImage[] = [];
      
      // ConvertAPI returns result with files array (one per page)
      // result.files is an array, or result.file for single file
      const files = result.files || (result.file ? [result.file] : []);
      
      if (files.length > 0) {
        // Download each image file
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          console.log(`[PDF Conversion] Downloading page ${i + 1}/${files.length}...`);
          
          // ConvertAPI file object has .url property (lowercase)
          const fileUrl = file.url;
          if (!fileUrl) {
            throw new Error(`File ${i + 1} has no URL`);
          }
          
          // Download the image file
          const imageResponse = await fetch(fileUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to download image ${i + 1}: ${imageResponse.statusText}`);
          }
          
          const imageArrayBuffer = await imageResponse.arrayBuffer();
          const imageBuffer = Buffer.from(imageArrayBuffer);
          
          // Get image dimensions using canvas
          const { loadImage } = await import("canvas");
          const img = await loadImage(imageBuffer);
          
          images.push({
            pageNumber: i + 1,
            imageBuffer: imageBuffer, // Already JPEG format from ConvertAPI
            width: img.width,
            height: img.height,
          });
          
          console.log(`[PDF Conversion] ✅ Page ${i + 1}/${files.length} downloaded (${Math.round(imageBuffer.length / 1024)}KB, ${img.width}x${img.height})`);
        }
      } else {
        throw new Error("ConvertAPI returned no image files");
      }
      
      if (images.length === 0) {
        throw new Error("No images were generated from PDF");
      }
      
      console.log(`[PDF Conversion] ✅ Successfully converted ${images.length} page(s) to images using ConvertAPI`);
      return images;
      
    } finally {
      // Clean up temp PDF file
      try {
        await fs.unlink(tempPdfPath).catch(() => {});
        console.log(`[PDF Conversion] Cleaned up temp PDF file`);
      } catch (cleanupError) {
        console.warn(`[PDF Conversion] Failed to clean up temp file: ${cleanupError}`);
      }
    }
  } catch (error: any) {
    console.error("[PDF Conversion] Error converting PDF to images:", error);
    console.error("[PDF Conversion] Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    throw new Error(`Failed to convert PDF to images: ${error.message}`);
  }
}

/**
 * Convert a PDF buffer to a single image (first page only)
 */
export async function convertPdfToSingleImage(
  pdfBuffer: Buffer,
  scale: number = 2.0
): Promise<PDFPageImage | null> {
  const images = await convertPdfToImages(pdfBuffer, scale);
  return images.length > 0 ? images[0] : null;
}
