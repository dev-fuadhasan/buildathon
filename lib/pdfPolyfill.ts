// PDF.js polyfills for Node.js environment
// This must be imported BEFORE pdfjs-dist

if (typeof window === "undefined") {
  // Set up DOMMatrix polyfill
  if (typeof (global as any).DOMMatrix === "undefined") {
    try {
      const dommatrix = require("dommatrix");
      // Handle both default export and named export
      const DOMMatrixClass = dommatrix.DOMMatrix || dommatrix.default || dommatrix;
      (global as any).DOMMatrix = DOMMatrixClass;
    } catch {
      // Fallback implementation - proper constructor
      (global as any).DOMMatrix = class DOMMatrix {
        a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
        m11 = 1; m12 = 0; m21 = 0; m22 = 1; m41 = 0; m42 = 0;
        constructor(init?: string | number[]) {
          if (init) {
            // Handle initialization if needed
          }
        }
      };
    }
  }
}

// Export empty to make this a module
export {};

