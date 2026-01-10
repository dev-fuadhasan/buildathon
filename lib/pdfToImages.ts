import { createCanvas } from "canvas";

export interface PDFPageImage {
  pageNumber: number;
  imageBuffer: Buffer;
  width: number;
  height: number;
}

/**
 * Convert a PDF buffer to an array of image buffers (one per page)
 * Uses pdfjs-dist v3 which has better Node.js support
 * @param pdfBuffer - The PDF file as a Buffer
 * @param scale - Scale factor for image quality (default: 2.0 for good quality)
 * @returns Array of image buffers with metadata
 */
export async function convertPdfToImages(
  pdfBuffer: Buffer,
  scale: number = 2.0
): Promise<PDFPageImage[]> {
  try {
    console.log(`[PDF Conversion] Starting conversion with pdfjs-dist v3...`);
    
    // Use pdfjs-dist v3 which has better Node.js support
    const pdfjsLib = await import("pdfjs-dist");
    
    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(pdfBuffer);
    
    // Set worker source BEFORE importing - use a data URL approach
    // For v3, we can use a simpler worker setup
    if (typeof window === "undefined") {
      // v3 uses a different worker setup
      const workerSrc = require.resolve("pdfjs-dist/build/pdf.worker.min.js");
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      console.log(`[PDF Conversion] Worker source set to: ${workerSrc}`);
    }
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
    });
    
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    const images: PDFPageImage[] = [];

    console.log(`[PDF Conversion] Converting ${numPages} page(s) to images...`);

    // Convert each page to an image
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // Create canvas
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");

      // Render PDF page
      const renderContext = {
        canvasContext: context as any,
        viewport: viewport,
      };

      await page.render(renderContext as any).promise;

      // Convert to JPEG
      const imageBuffer = canvas.toBuffer("image/jpeg", { quality: 0.9 });

      images.push({
        pageNumber: pageNum,
        imageBuffer,
        width: viewport.width,
        height: viewport.height,
      });

      console.log(`[PDF Conversion] Page ${pageNum}/${numPages} converted (${Math.round(imageBuffer.length / 1024)}KB)`);
    }

    console.log(`[PDF Conversion] ✅ Successfully converted ${numPages} page(s) to images`);
    return images;
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
