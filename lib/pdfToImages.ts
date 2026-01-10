import { createCanvas } from "canvas";

export interface PDFPageImage {
  pageNumber: number;
  imageBuffer: Buffer;
  width: number;
  height: number;
}

/**
 * Convert a PDF buffer to an array of image buffers (one per page)
 * Uses pdfjs-dist v4 with proper worker configuration for Next.js serverless
 * @param pdfBuffer - The PDF file as a Buffer
 * @param scale - Scale factor for image quality (default: 2.0 for good quality)
 * @returns Array of image buffers with metadata
 */
export async function convertPdfToImages(
  pdfBuffer: Buffer,
  scale: number = 2.0
): Promise<PDFPageImage[]> {
  try {
    console.log(`[PDF Conversion] Starting conversion with pdfjs-dist v4...`);
    
    // Import pdfjs-dist dynamically
    const pdfjsLib = await import("pdfjs-dist");
    
    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(pdfBuffer);
    
    // Configure worker for serverless environment
    // Use CDN worker URL - most reliable for serverless (Vercel, etc.)
    if (typeof window === "undefined") {
      const version = pdfjsLib.version || "4.0.379";
      
      // Use unpkg CDN (more reliable than jsdelivr for serverless)
      const workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
      
      // Set worker source - must be set before getDocument
      if (pdfjsLib.GlobalWorkerOptions) {
        // Create new object to avoid "not extensible" error
        pdfjsLib.GlobalWorkerOptions = {
          ...pdfjsLib.GlobalWorkerOptions,
          workerSrc: workerSrc,
        };
        console.log(`[PDF Conversion] Worker source configured: ${workerSrc}`);
      } else {
        // Fallback: try to set it directly
        (pdfjsLib as any).GlobalWorkerOptions = { workerSrc };
        console.log(`[PDF Conversion] Worker source set (fallback): ${workerSrc}`);
      }
      
      // Verify it's set
      const actualWorkerSrc = pdfjsLib.GlobalWorkerOptions?.workerSrc || (pdfjsLib as any).GlobalWorkerOptions?.workerSrc;
      if (!actualWorkerSrc) {
        throw new Error("Failed to configure PDF.js worker - GlobalWorkerOptions.workerSrc is not set");
      }
      console.log(`[PDF Conversion] Verified worker source: ${actualWorkerSrc}`);
    }
    
    // Load PDF document
    console.log(`[PDF Conversion] Loading PDF document (${Math.round(pdfBuffer.length / 1024)}KB)...`);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      // Disable worker if CDN fails (fallback to main thread)
      verbosity: 0, // Reduce logging
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
