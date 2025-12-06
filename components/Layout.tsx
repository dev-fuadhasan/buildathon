"use client";

import { PropsWithChildren } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

type Props = PropsWithChildren;

export default function Layout({ children }: Props) {
  const t = useTranslation();
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - Soft and welcoming */}
      <header className="bg-white/80 backdrop-blur-md border-b border-neutral-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="text-2xl font-bold gradient-text">MomsCare</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/chat"
                className="text-neutral-600 hover:text-pink-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-pink-50"
              >
                {t.chat.title}
              </Link>
              <Link
                href="/mother/login"
                className="text-neutral-600 hover:text-pink-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-pink-50"
              >
                {t.common.login}
              </Link>
              <Link
                href="/mother/register"
                className="btn-primary text-sm px-4 py-2"
              >
                {t.common.register}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer - Minimal and clean */}
      {isHome && (
        <footer className="bg-white/60 backdrop-blur-sm border-t border-neutral-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center text-sm text-neutral-500">
              <p>© {new Date().getFullYear()} MomsCare. All rights reserved.</p>
              <p className="mt-1">Made with ❤️ for mothers everywhere</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
