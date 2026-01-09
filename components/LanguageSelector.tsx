"use client";

import { useState, useEffect } from "react";
import { Language, getLanguage, setLanguage } from "@/lib/i18n";

export default function LanguageSelector() {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    const savedLang = getLanguage();
    setLang(savedLang);
    
    // Listen for language changes from other components
    const handleLanguageChange = (event: CustomEvent<Language>) => {
      setLang(event.detail);
    };
    
    window.addEventListener("languagechange", handleLanguageChange as EventListener);
    
    return () => {
      window.removeEventListener("languagechange", handleLanguageChange as EventListener);
    };
  }, []);

  const handleToggle = () => {
    const newLang: Language = lang === "en" ? "bn" : "en";
    setLanguage(newLang);
    setLang(newLang);
    // Trigger a custom event to notify all components
    window.dispatchEvent(new CustomEvent("languagechange", { detail: newLang }));
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-pink-300 transition-colors min-w-[50px] shadow-sm"
      title={lang === "en" ? "Switch to বাংলা" : "Switch to English"}
    >
      <span className="text-sm font-semibold">{lang === "en" ? "EN" : "BN"}</span>
    </button>
  );
}

