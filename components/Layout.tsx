"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";
import LanguageSelector from "./LanguageSelector";

const links = [
  { href: "/", label: "Home" },
  { href: "/chat", label: "Chat" },
  { href: "/mother/dashboard", label: "Mother" },
  { href: "/doctor/dashboard", label: "Doctor" },
  { href: "/admin/dashboard", label: "Admin" },
];

export default function Layout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");
  
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-12 pt-8">
      <nav className="mb-8 flex items-center justify-between rounded-2xl bg-white/90 p-4 shadow-lg backdrop-blur border border-white/60">
        <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">
          🌸 MomsCare
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-sm">
            {links.filter(link => !isAdminPage || link.href === "/admin/dashboard").map((link) => {
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
                  {link.label}
                </Link>
              );
            })}
          </div>
          <LanguageSelector />
        </div>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}

