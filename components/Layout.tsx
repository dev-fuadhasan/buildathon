"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";
import LanguageSelector from "./LanguageSelector";
import { useTranslation } from "@/hooks/useTranslation";

const links = [
  { href: "/", key: "home" },
  { href: "/chat", key: "chat" },
  { href: "/mother/dashboard", key: "mother" },
  { href: "/doctor/dashboard", key: "doctor" },
];

export default function Layout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const t = useTranslation();
  
  const linkLabels: Record<string, string> = {
    home: t.common.home || "Home",
    chat: t.chat.title || "Chat",
    mother: t.mother.dashboard || "Mother",
    doctor: t.doctor.dashboard || "Doctor",
  };
  
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-4 pt-4">
      <nav className="mb-4 flex items-center justify-between rounded-2xl bg-white/90 p-3 shadow-lg backdrop-blur border border-white/60">
        <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">
          🌸 MomsCare
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-sm">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-4 py-2 font-medium transition-all ${
                    active 
                      ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md" 
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {linkLabels[link.key] || link.key}
                </Link>
              );
            })}
          </div>
          <LanguageSelector />
        </div>
      </nav>
      <div className="flex-1">{children}</div>
      <footer className="mt-8 py-4 border-t border-slate-200 text-center text-sm text-slate-600">
        <Link href="/privacy" className="hover:text-purple-600 transition-colors">
          Privacy Policy & Data Ethics
        </Link>
      </footer>
    </div>
  );
}

