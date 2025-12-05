"use client";

import { useState, useEffect } from "react";
import { Language, getLanguage, setLanguage } from "@/lib/i18n";

export default function LanguageSelector() {
  const [lang, setLang] = useState<Language>("en");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const savedLang = getLanguage();
    setLang(savedLang);
    // Show modal on first visit if no language is set
    if (!localStorage.getItem("language")) {
      setShowModal(true);
    }
  }, []);

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    setLang(newLang);
    setShowModal(false);
    window.location.reload(); // Reload to apply translations
  };

  return (
    <>
      {/* Language Toggle Button */}
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        title="Change Language"
      >
        <span className="text-lg">🌐</span>
        <span>{lang === "en" ? "English" : "বাংলা"}</span>
      </button>

      {/* Language Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="mb-6 text-2xl font-bold text-slate-800">
              Select Language / ভাষা নির্বাচন করুন
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => handleLanguageChange("en")}
                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                  lang === "en"
                    ? "border-pink-500 bg-pink-50"
                    : "border-slate-200 hover:border-pink-300 hover:bg-pink-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇬🇧</span>
                  <div>
                    <p className="font-semibold text-slate-800">English</p>
                    <p className="text-sm text-slate-600">Select English language</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleLanguageChange("bn")}
                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                  lang === "bn"
                    ? "border-pink-500 bg-pink-50"
                    : "border-slate-200 hover:border-pink-300 hover:bg-pink-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇧🇩</span>
                  <div>
                    <p className="font-semibold text-slate-800">বাংলা</p>
                    <p className="text-sm text-slate-600">বাংলা ভাষা নির্বাচন করুন</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

