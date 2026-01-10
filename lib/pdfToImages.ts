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

import * as pdfjsLib from "pdfjs-dist";
import { createCanvas } from "canvas";

// Set up the worker for pdfjs-dist
if (typeof window === "undefined") {
  // Empty string disables worker and uses main thread (better for serverless)
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";
}

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
    // Try legacy build first, fallback to regular build
    let pdfjsLib: any;
    try {
      pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as any);
    } catch {
      // Fallback to regular build
      pdfjsLib = await import("pdfjs-dist/build/pdf.mjs" as any);
    }
    
    // Set up worker (disable for serverless)
    if (typeof window === "undefined") {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "";
    }
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBuffer,
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

