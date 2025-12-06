"use client";

import { getTranslations } from "@/lib/i18n";

export function useTranslation() {
  // Always return English translations - Bangla removed from UI
  // Bangla still works in chat functionality
  return getTranslations("en");
}
