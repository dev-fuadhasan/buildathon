"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/chat", label: "Chat" },
  { href: "/mother/dashboard", label: "Mother" },
  { href: "/doctor/dashboard", label: "Doctor" },
  { href: "/admin/dashboard", label: "Admin" },
];

export default function Layout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-12 pt-8">
      <nav className="mb-8 flex items-center justify-between rounded-2xl bg-white/80 p-4 shadow-md backdrop-blur">
        <Link href="/" className="text-xl font-bold text-pink-600">
          MomsCare
        </Link>
        <div className="flex gap-2 text-sm">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 font-medium ${
                  active ? "bg-pink-100 text-pink-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}

