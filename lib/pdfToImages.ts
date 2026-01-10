import { createCanvas } from "canvas";

export interface PDFPageImage {
  pageNumber: number;
  imageBuffer: Buffer;
  width: number;
  height: number;
}

/**
 * Convert a PDF buffer to an array of image buffers (one per page)
 * Uses pdfjs-dist legacy build with proper worker configuration for serverless
 * @param pdfBuffer - The PDF file as a Buffer
 * @param scale - Scale factor for image quality (default: 2.0 for good quality)
 * @returns Array of image buffers with metadata
 */
export async function convertPdfToImages(
  pdfBuffer: Buffer,
  scale: number = 2.0
): Promise<PDFPageImage[]> {
  try {
    console.log(`[PDF Conversion] Starting conversion...`);
    
    // Use legacy build which has better Node.js/serverless support
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    
    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(pdfBuffer);
    
    // Configure worker using legacy build's recommended approach
    if (typeof window === "undefined") {
      // Legacy build uses import.meta.url for worker resolution
      // For serverless, we'll use a CDN worker
      const version = pdfjsLib.version || "4.0.379";
      const workerUrl = `https://unpkg.com/pdfjs-dist@${version}/legacy/build/pdf.worker.min.mjs`;
      
      // Set worker source
      if (pdfjsLib.GlobalWorkerOptions) {
        // Use Object.assign to avoid "not extensible" error
        Object.assign(pdfjsLib.GlobalWorkerOptions, { workerSrc: workerUrl });
        console.log(`[PDF Conversion] Worker configured: ${workerUrl}`);
      }
    }
    
    // Load PDF document
    console.log(`[PDF Conversion] Loading PDF document (${Math.round(pdfBuffer.length / 1024)}KB)...`);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      verbosity: 0,
    });
    
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    const images: PDFPageImage[] = [];

    console.log(`[PDF Conversion] PDF loaded: ${numPages} page(s)`);

    // Convert each page to an image
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      console.log(`[PDF Conversion] Processing page ${pageNum}/${numPages}...`);
      
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

      console.log(`[PDF Conversion] ✅ Page ${pageNum}/${numPages} converted (${Math.round(imageBuffer.length / 1024)}KB)`);
    }

    if (images.length === 0) {
      throw new Error("No pages extracted from PDF");
    }

    console.log(`[PDF Conversion] ✅ Successfully converted ${images.length} page(s) to images`);
    return images;
  } catch (error: any) {
    console.error("[PDF Conversion] Error converting PDF to images:", error);
    console.error("[PDF Conversion] Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    // If worker error, provide helpful message
    if (error.message?.includes("worker") || error.message?.includes("Worker") || error.message?.includes("module")) {
      throw new Error(`PDF conversion failed: Worker configuration issue in serverless environment. Please try uploading as images (PNG/JPG) instead. Technical error: ${error.message}`);
    }
    
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
