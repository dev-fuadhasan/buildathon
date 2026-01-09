"use client";

import { useState, useEffect } from "react";
import { getTranslations, getLanguage, Language } from "@/lib/i18n";

export function useTranslation() {
  const [lang, setLang] = useState<Language>(() => getLanguage());
  const [translations, setTranslations] = useState(() => getTranslations(lang));

  useEffect(() => {
    // Listen for language changes
    const handleLanguageChange = (event?: CustomEvent<Language>) => {
      const newLang = event?.detail || getLanguage();
      setLang(newLang);
      setTranslations(getTranslations(newLang));
    };

    // Listen for custom language change events
    window.addEventListener("languagechange", handleLanguageChange as EventListener);

    // Listen for storage events (cross-tab)
    window.addEventListener("storage", () => {
      const newLang = getLanguage();
      if (newLang !== lang) {
        handleLanguageChange();
      }
    });

    // Check for language changes periodically (for cross-tab sync)
    const interval = setInterval(() => {
      const currentLang = getLanguage();
      if (currentLang !== lang) {
        handleLanguageChange();
      }
    }, 500);

    return () => {
      clearInterval(interval);
      window.removeEventListener("languagechange", handleLanguageChange as EventListener);
      window.removeEventListener("storage", handleLanguageChange as EventListener);
    };
  }, [lang]);

  return translations;
}
