"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getLanguage, getTranslations } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";

export default function Home() {
  const [t, setT] = useState(getTranslations("en"));

  useEffect(() => {
    const lang = getLanguage();
    setT(getTranslations(lang));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-4">
      {/* Language Toggle - Top Right */}
      <div className="flex justify-end">
        <LanguageSelector />
      </div>
      
      {/* Hero Section */}
      <header className="flex flex-col gap-8 rounded-3xl bg-gradient-to-br from-pink-50 via-white to-blue-50 p-12 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <div className="mb-4 inline-block rounded-full bg-pink-100 px-4 py-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-600">
                MomsCare
              </p>
            </div>
            <h1 className="mt-2 text-5xl font-bold text-slate-900 md:text-6xl lg:text-7xl">
              {t.home.title}
          </h1>
            <p className="mt-6 max-w-2xl text-xl text-slate-600 leading-relaxed">
              {t.home.subtitle}
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:from-pink-600 hover:to-pink-700 hover:shadow-xl"
              >
                <span>💬</span>
                {t.home.chatButton}
              </Link>
              <Link
                href="/mother/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-pink-300 bg-white px-8 py-4 text-lg font-semibold text-pink-600 transition-all hover:bg-pink-50"
              >
                <span>👩</span>
                {t.home.motherButton}
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="text-8xl">🤱</div>
          </div>
        </div>

        {/* Features */}
        <div className="grid gap-6 md:grid-cols-3 mt-8">
          {[
            { icon: "🤖", text: t.home.feature1 },
            { icon: "👨‍⚕️", text: t.home.feature2 },
            { icon: "🔒", text: t.home.feature3 },
          ].map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur transition-all hover:shadow-xl hover:scale-105"
            >
              <div className="mb-3 text-4xl">{item.icon}</div>
              <p className="text-sm font-semibold text-pink-600 mb-2">Feature</p>
              <p className="text-base font-medium text-slate-700 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </header>

      {/* User Sections */}
      <section className="grid gap-8 md:grid-cols-2">
        {/* Mothers Section */}
        <div className="group rounded-3xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-white p-8 shadow-xl transition-all hover:shadow-2xl hover:scale-[1.02]">
          <div className="mb-4 text-5xl">👩‍👶</div>
          <h3 className="mb-3 text-2xl font-bold text-slate-900">{t.home.mothersTitle}</h3>
          <p className="mb-6 text-slate-600 leading-relaxed">{t.home.mothersDesc}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/mother/register"
              className="rounded-lg bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-3 font-semibold text-white shadow-md transition-all hover:from-pink-600 hover:to-pink-700 hover:shadow-lg"
            >
              {t.common.register}
            </Link>
            <Link
              href="/mother/login"
              className="rounded-lg border-2 border-pink-300 bg-white px-6 py-3 font-semibold text-pink-600 transition-all hover:bg-pink-50"
            >
              {t.common.login}
            </Link>
          </div>
        </div>

        {/* Doctors Section */}
        <div className="group rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-8 shadow-xl transition-all hover:shadow-2xl hover:scale-[1.02]">
          <div className="mb-4 text-5xl">👨‍⚕️</div>
          <h3 className="mb-3 text-2xl font-bold text-slate-900">{t.home.doctorsTitle}</h3>
          <p className="mb-6 text-slate-600 leading-relaxed">{t.home.doctorsDesc}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/doctor/register"
              className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 font-semibold text-white shadow-md transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow-lg"
            >
              Apply
            </Link>
            <Link
              href="/doctor/login"
              className="rounded-lg border-2 border-blue-300 bg-white px-6 py-3 font-semibold text-blue-600 transition-all hover:bg-blue-50"
          >
              Doctor {t.common.login}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 text-center text-slate-500">
        <p className="text-sm">
          © {new Date().getFullYear()} MomsCare. All rights reserved.
        </p>
      </footer>
      </main>
  );
}
