"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@/components/Icon";

type Props = PropsWithChildren;

export default function Layout({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";
  const [isMother, setIsMother] = useState(false);
  const [isDoctor, setIsDoctor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check login state
    const motherToken = localStorage.getItem("motherToken");
    const doctorToken = localStorage.getItem("doctorToken");
    const adminToken = localStorage.getItem("adminToken");
    
    setIsMother(!!motherToken);
    setIsDoctor(!!doctorToken);
    setIsAdmin(!!adminToken);

    // Redirect logged-in users to their dashboards if on home page
    if (isHome) {
      if (motherToken) {
        router.push("/mother/dashboard");
        return;
      } else if (doctorToken) {
        router.push("/doctor/dashboard");
        return;
      } else if (adminToken) {
        router.push("/admin/dashboard");
        return;
      }
    }
  }, [isHome, router]);

  // Determine navbar items based on login state
  const getNavItems = () => {
    if (isMother || isDoctor || isAdmin) {
      // Logged in - show chat link
      return (
        <>
          <Link
            href="/chat"
            className={`font-medium transition-colors px-3 py-2 rounded-lg flex items-center gap-2 ${
              pathname === "/chat"
                ? "bg-pink-100 text-pink-700 border-2 border-pink-300"
                : "text-neutral-600 hover:text-pink-600 hover:bg-pink-50"
            }`}
          >
            <Icon name="chat" size={18} />
            MomsCare AI Chat
          </Link>
        </>
      );
    } else {
      // Not logged in - show chat, login, register based on context
      if (pathname.startsWith("/doctor") || pathname === "/") {
        // Doctor context or home
        return (
          <>
            <Link
              href="/chat"
              className={`font-medium transition-colors px-3 py-2 rounded-lg flex items-center gap-2 ${
                pathname === "/chat"
                  ? "bg-pink-100 text-pink-700 border-2 border-pink-300"
                  : "text-neutral-600 hover:text-pink-600 hover:bg-pink-50"
              }`}
            >
              <Icon name="chat" size={18} />
              MomsCare AI Chat
            </Link>
            <Link
              href="/doctor/login"
              className={`font-medium transition-colors px-3 py-2 rounded-lg ${
                pathname === "/doctor/login"
                  ? "bg-pink-100 text-pink-700 border-2 border-pink-300"
                  : pathname === "/doctor/register"
                  ? "text-pink-600 border-2 border-pink-300 bg-transparent"
                  : "text-neutral-600 hover:text-pink-600 hover:bg-pink-50"
              }`}
            >
              Login
            </Link>
            <Link
              href="/doctor/register"
              className={`text-sm px-4 py-2 rounded-xl font-semibold transition-all ${
                pathname === "/doctor/register"
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg"
                  : "text-pink-600 border-2 border-pink-300 bg-transparent"
              }`}
            >
              Register
            </Link>
          </>
        );
      } else {
        // Mother context
        return (
          <>
            <Link
              href="/chat"
              className={`font-medium transition-colors px-3 py-2 rounded-lg flex items-center gap-2 ${
                pathname === "/chat"
                  ? "bg-pink-100 text-pink-700 border-2 border-pink-300"
                  : "text-neutral-600 hover:text-pink-600 hover:bg-pink-50"
              }`}
            >
              <Icon name="chat" size={18} />
              MomsCare AI Chat
            </Link>
            <Link
              href="/mother/login"
              className={`font-medium transition-colors px-3 py-2 rounded-lg ${
                pathname === "/mother/login"
                  ? "bg-pink-100 text-pink-700 border-2 border-pink-300"
                  : pathname === "/mother/register"
                  ? "text-pink-600 border-2 border-pink-300 bg-transparent"
                  : "text-neutral-600 hover:text-pink-600 hover:bg-pink-50"
              }`}
            >
              Login
            </Link>
            <Link
              href="/mother/register"
              className={`text-sm px-4 py-2 rounded-xl font-semibold transition-all ${
                pathname === "/mother/register"
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg"
                  : "text-pink-600 border-2 border-pink-300 bg-transparent"
              }`}
            >
              Register
            </Link>
          </>
        );
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - Soft and welcoming */}
      <header className="bg-white/80 backdrop-blur-md border-b border-neutral-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <span className="text-white font-bold text-base sm:text-lg">M</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold gradient-text">MomsCare</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              {getNavItems()}
            </nav>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-neutral-600 hover:bg-pink-50 hover:text-pink-600 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Mobile menu */}
          {mobileMenuOpen && (
            <nav className="md:hidden mt-4 pb-4 border-t border-neutral-200 pt-4 flex flex-col gap-3">
              {getNavItems()}
            </nav>
          )}
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
