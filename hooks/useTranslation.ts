"use client";

import { useEffect, useState } from "react";
import { getLanguage, getTranslations, Language } from "@/lib/i18n";

export function useTranslation() {
  const [lang, setLang] = useState<Language>("en");
  const [t, setT] = useState(getTranslations("en"));

  useEffect(() => {
    const currentLang = getLanguage();
    setLang(currentLang);
    setT(getTranslations(currentLang));
  }, []);

  return t;
}

