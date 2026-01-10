// Polyfill for Node.js environment (required by pdfjs-dist)
// Must be set up BEFORE importing pdfjs-dist
if (typeof window === "undefined") {
  // Add DOMMatrix polyfill for Node.js
  if (typeof (global as any).DOMMatrix === "undefined") {
    try {
      // Try to use dommatrix package if available
      const { DOMMatrix } = require("dommatrix");
      (global as any).DOMMatrix = DOMMatrix;
    } catch {
      // Fallback: simple DOMMatrix implementation
      (global as any).DOMMatrix = class DOMMatrix {
        a = 1;
        b = 0;
        c = 0;
        d = 1;
        e = 0;
        f = 0;
        m11 = 1;
        m12 = 0;
        m21 = 0;
        m22 = 1;
        m41 = 0;
        m42 = 0;
        constructor(init?: string | number[]) {
          if (init) {
            // Simple implementation
          }
        }
      };
    }
  }
}

import { createCanvas } from "canvas";

// Note: pdfjs-dist is imported dynamically to use legacy build
// GlobalWorkerOptions is set on the dynamically imported module, not here

export interface PDFPageImage {
  pageNumber: number;
  imageBuffer: Buffer;
  width: number;
  height: number;
}

/**
 * Convert a PDF buffer to an array of image buffers (one per page)
 * @param pdfBuffer - The PDF file as a Buffer
 * @param scale - Scale factor for image quality (default: 2.0 for good quality)
 * @returns Array of image buffers with metadata
 */
export async function convertPdfToImages(
  pdfBuffer: Buffer,
  scale: number = 2.0
): Promise<PDFPageImage[]> {
  try {
    // Convert Buffer to Uint8Array (required by pdfjs-dist)
    const uint8Array = new Uint8Array(pdfBuffer);
    
    // Try legacy build first, fallback to regular build
    let pdfjsLib: any;
    try {
      pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as any);
    } catch {
      // Fallback to regular build
      pdfjsLib = await import("pdfjs-dist/build/pdf.mjs" as any);
    }
    
    // Set up worker (disable for serverless) - MUST be set on the dynamically imported module
    if (typeof window === "undefined") {
      // The dynamically imported module needs GlobalWorkerOptions set
      // Try multiple ways to set it based on module structure
      if (!pdfjsLib.GlobalWorkerOptions) {
        // Create GlobalWorkerOptions if it doesn't exist
        pdfjsLib.GlobalWorkerOptions = {};
      }
      
      // Set worker source to empty string to disable worker (use main thread)
      pdfjsLib.GlobalWorkerOptions.workerSrc = "";
      
      // Also try setting it on the default export if it exists
      if (pdfjsLib.default && !pdfjsLib.default.GlobalWorkerOptions) {
        pdfjsLib.default.GlobalWorkerOptions = { workerSrc: "" };
      }
      
      console.log(`[PDF Conversion] Worker disabled: GlobalWorkerOptions.workerSrc = "${pdfjsLib.GlobalWorkerOptions.workerSrc}"`);
    }
    
    // Load the PDF document - use Uint8Array instead of Buffer
    // Use disableWorker option if available (for some pdfjs-dist versions)
    const getDocumentOptions: any = {
      data: uint8Array,
      useSystemFonts: true,
    };
    
    // Try to disable worker in options (some versions support this)
    if (typeof window === "undefined") {
      // Check if disableWorker option is supported
      try {
        getDocumentOptions.disableWorker = true;
      } catch {
        // If not supported, rely on GlobalWorkerOptions.workerSrc = ""
      }
    }
    
    const loadingTask = pdfjsLib.getDocument(getDocumentOptions);

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    const images: PDFPageImage[] = [];

    console.log(`[PDF Conversion] Converting ${numPages} page(s) to images...`);

    // Convert each page to an image
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // Create a canvas with the same dimensions as the PDF page
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");

      // Render the PDF page into the canvas context
      // Type assertion needed because node-canvas types don't exactly match browser Canvas types
      const renderContext = {
        canvasContext: context as any,
        viewport: viewport,
      };

      await page.render(renderContext as any).promise;

      // Convert canvas to JPEG buffer (smaller file size, better for storage)
      // Quality: 0.9 (90%) for good balance between quality and file size
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
 * Useful for thumbnails or single-page PDFs
 */
export async function convertPdfToSingleImage(
  pdfBuffer: Buffer,
  scale: number = 2.0
): Promise<PDFPageImage | null> {
  const images = await convertPdfToImages(pdfBuffer, scale);
  return images.length > 0 ? images[0] : null;
}

