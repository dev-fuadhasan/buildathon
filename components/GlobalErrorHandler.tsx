"use client";

import { useEffect } from "react";
import { initGlobalErrorHandlers } from "@/lib/safeAsync";

/**
 * Global Error Handler Component
 * Initializes global error handlers to prevent unhandled rejections from breaking the app
 * Must be included in root layout
 */
export default function GlobalErrorHandler() {
  useEffect(() => {
    initGlobalErrorHandlers();
  }, []);

  return null; // This component doesn't render anything
}

