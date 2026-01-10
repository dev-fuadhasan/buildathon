import { createCanvas, loadImage } from "canvas";
import { pdfToImg } from "pdftoimg-js";

export interface PDFPageImage {
  pageNumber: number;
  imageBuffer: Buffer;
  width: number;
  height: number;
}

/**
 * Convert a PDF buffer to an array of image buffers (one per page)
 * Uses pdftoimg-js library - simple, reliable, no worker issues
 * @param pdfBuffer - The PDF file as a Buffer
 * @param scale - Scale factor for image quality (default: 2.0 for good quality)
 * @returns Array of image buffers with metadata
 */
export async function convertPdfToImages(
  pdfBuffer: Buffer,
  scale: number = 2.0
): Promise<PDFPageImage[]> {
  try {
    console.log(`[PDF Conversion] Starting conversion with pdftoimg-js library...`);
    
    // pdftoimg-js needs a file path, so write to temp file first
    const fs = await import("fs/promises");
    const path = await import("path");
    const os = await import("os");
    
    const tempDir = os.tmpdir();
    const tempPdfPath = path.join(tempDir, `pdf_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
    const tempOutputDir = path.join(tempDir, `pdf_images_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    
    try {
      // Write PDF buffer to temp file
      await fs.writeFile(tempPdfPath, pdfBuffer);
      await fs.mkdir(tempOutputDir, { recursive: true });
      
      console.log(`[PDF Conversion] PDF written to temp file: ${tempPdfPath}`);
      
      // Convert PDF to images using pdftoimg-js
      // scale: 2.0 means 2x resolution (200% quality)
      const images = await pdfToImg(tempPdfPath, {
        pages: "all", // Convert all pages
        imgType: "jpg", // Output as JPEG
        scale: scale, // Scale factor
        background: "white", // White background
        outputPath: tempOutputDir, // Output directory
      });
      
      console.log(`[PDF Conversion] pdftoimg-js returned ${images.length} image(s)`);
      
      const result: PDFPageImage[] = [];
      
      // Read the generated image files
      const files = await fs.readdir(tempOutputDir);
      const imageFiles = files
        .filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg'))
        .sort((a, b) => {
          // Sort by page number
          const numA = parseInt(a.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });
      
      for (let i = 0; i < imageFiles.length; i++) {
        const imagePath = path.join(tempOutputDir, imageFiles[i]);
        const imageBuffer = await fs.readFile(imagePath);
        
        // Get image dimensions
        const img = await loadImage(imageBuffer);
        
        result.push({
          pageNumber: i + 1,
          imageBuffer: imageBuffer, // Already JPEG format
          width: img.width,
          height: img.height,
        });
        
        console.log(`[PDF Conversion] Page ${i + 1}/${imageFiles.length} processed (${Math.round(imageBuffer.length / 1024)}KB, ${img.width}x${img.height})`);
      }
      
      if (result.length === 0) {
        throw new Error("No images were generated from PDF");
      }
      
      console.log(`[PDF Conversion] ✅ Successfully converted ${result.length} page(s) to images`);
      return result;
      
    } finally {
      // Clean up temp files
      try {
        await fs.unlink(tempPdfPath).catch(() => {});
        await fs.rm(tempOutputDir, { recursive: true, force: true }).catch(() => {});
        console.log(`[PDF Conversion] Cleaned up temp files`);
      } catch (cleanupError) {
        console.warn(`[PDF Conversion] Failed to clean up temp files: ${cleanupError}`);
      }
    }
  } catch (error: any) {
    console.error("[PDF Conversion] Error converting PDF to images:", error);
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
