"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import LanguageSelector from "@/components/LanguageSelector";
import { useTranslation } from "@/hooks/useTranslation";
import BottomNav from "./BottomNav";
import { Suspense } from "react";
type Props = PropsWithChildren;

export default function Layout({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslation();
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

    // Removed auto-redirect - users can now visit landing page even when logged in
  }, [isHome, router]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Determine navbar items based on login state
  const getNavItems = () => {
    if (isMother) {
      // Logged in as mother - show full navigation
      return (
        <>
            <Link
              href="/mother/dashboard"
              className={`font-medium transition-colors px-4 py-2 rounded-lg ${
                pathname === "/mother/dashboard"
                  ? "text-pink-600 bg-pink-50 font-semibold"
                  : "text-neutral-600 hover:text-pink-600 hover:bg-pink-50"
              }`}
            >
              {t.mother.dashboard}
            </Link>
            <Link
              href="/chat"
              className={`font-medium transition-colors px-4 py-2 rounded-lg flex items-center gap-2 ${
                pathname === "/chat"
                  ? "bg-pink-100 text-pink-700 border-2 border-pink-300"
                  : "text-neutral-600 hover:text-pink-600 hover:bg-pink-50"
              }`}
            >
              <Icon name="chat" size={18} />
              {t.chat.title}
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem("motherToken");
              location.href = "/";
            }}
            className="font-medium transition-colors px-4 py-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {t.common.logout}
          </button>
        </>
      );
    } else if (isDoctor) {
      // Logged in as doctor - show navigation
      return (
        <>
          <Link
            href="/doctor/dashboard"
            className={`font-medium transition-colors px-4 py-2 rounded-lg ${
              pathname === "/doctor/dashboard"
                ? "text-blue-600 bg-blue-50 font-semibold"
                : "text-neutral-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            {t.doctor.dashboard}
          </Link>
          <Link
            href="/doctor/dashboard"
            className={`font-medium transition-colors px-4 py-2 rounded-lg ${
              pathname === "/doctor/dashboard"
                ? "text-blue-600 bg-blue-50 font-semibold"
                : "text-neutral-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            {t.mother.questions}
          </Link>
          <Link
            href="/doctor/profile"
            className={`font-medium transition-colors px-4 py-2 rounded-lg ${
              pathname === "/doctor/profile"
                ? "text-blue-600 bg-blue-50 font-semibold"
                : "text-neutral-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            {t.doctor.myProfile}
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem("doctorToken");
              location.href = "/";
            }}
            className="font-medium transition-colors px-4 py-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {t.common.logout}
          </button>
        </>
      );
    } else if (isAdmin) {
      // Logged in as admin - show chat link
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
      // Not logged in - show full navigation
      if (isHome) {
        // Homepage - show full navigation menu
        return (
          <>
            <Link
              href="/"
              className={`font-medium transition-colors px-3 py-2 rounded-lg ${
                pathname === "/"
                  ? "text-pink-600 font-semibold"
                  : "text-neutral-600 hover:text-pink-600"
              }`}
            >
              {t.common.home}
            </Link>
            <a
              href="#get-started"
              onClick={(e) => { e.preventDefault(); scrollToSection("get-started"); }}
              className="font-medium transition-colors px-3 py-2 rounded-lg text-neutral-600 hover:text-pink-600 cursor-pointer"
            >
              {t.home.mothersTitle}
            </a>
            <a
              href="#get-started"
              onClick={(e) => { e.preventDefault(); scrollToSection("get-started"); }}
              className="font-medium transition-colors px-3 py-2 rounded-lg text-neutral-600 hover:text-blue-600 cursor-pointer"
            >
              {t.home.doctorsTitle}
            </a>
            <a
              href="#features"
              onClick={(e) => { e.preventDefault(); scrollToSection("features"); }}
              className="font-medium transition-colors px-3 py-2 rounded-lg text-neutral-600 hover:text-pink-600 cursor-pointer"
            >
              Features
            </a>
            <Link
              href="/chat"
              className="font-medium transition-colors px-3 py-2 rounded-lg flex items-center gap-2 text-neutral-600 hover:text-pink-600 hover:bg-pink-50"
            >
              <Icon name="chat" size={18} />
              {t.chat.title}
            </Link>
            <Link
              href="/mother/login"
              className="text-sm font-semibold transition-all px-4 py-2.5 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md hover:shadow-lg transform hover:scale-105"
            >
              {t.common.login}
            </Link>
          </>
        );
      } else if (pathname.startsWith("/doctor") || pathname.startsWith("/healthworker")) {
        // Health worker context
        return (
          <>
            <Link
              href="/"
              className="font-medium transition-colors px-3 py-2 rounded-lg text-neutral-600 hover:text-pink-600"
            >
              {t.common.home}
            </Link>
            <Link
              href="/chat"
              className={`font-medium transition-colors px-3 py-2 rounded-lg flex items-center gap-2 ${
                pathname === "/chat"
                  ? "bg-pink-100 text-pink-700 border-2 border-pink-300"
                  : "text-neutral-600 hover:text-pink-600 hover:bg-pink-50"
              }`}
            >
              <Icon name="chat" size={18} />
              {t.chat.title}
            </Link>
            <Link
              href="/healthworker/login"
              className={`text-sm font-semibold transition-all px-4 py-2.5 rounded-lg cursor-pointer ${
                pathname === "/healthworker/login" || pathname === "/doctor/login"
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg"
                  : pathname === "/healthworker/register" || pathname === "/doctor/register"
                  ? "text-pink-600 border-2 border-pink-300 bg-transparent"
                  : "text-neutral-600 hover:text-pink-600 hover:bg-pink-50 border-2 border-transparent"
              }`}
            >
              {t.common.login}
            </Link>
            <Link
              href="/healthworker/register"
              className={`text-sm font-semibold transition-all px-4 py-2.5 rounded-lg cursor-pointer ${
                pathname === "/healthworker/register" || pathname === "/doctor/register"
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg"
                  : pathname === "/healthworker/login" || pathname === "/doctor/login"
                  ? "text-pink-600 border-2 border-pink-300 bg-transparent"
                  : "text-neutral-600 hover:text-pink-600 hover:bg-pink-50 border-2 border-transparent"
              }`}
            >
              {t.common.register}
            </Link>
          </>
        );
      } else {
        // Mother context
        return (
          <>
            <Link
              href="/"
              className="font-medium transition-colors px-3 py-2 rounded-lg text-neutral-600 hover:text-pink-600"
            >
              {t.common.home}
            </Link>
            <Link
              href="/chat"
              className={`font-medium transition-colors px-3 py-2 rounded-lg flex items-center gap-2 ${
                pathname === "/chat"
                  ? "bg-pink-100 text-pink-700 border-2 border-pink-300"
                  : "text-neutral-600 hover:text-pink-600 hover:bg-pink-50"
              }`}
            >
              <Icon name="chat" size={18} />
              {t.chat.title}
            </Link>
            <Link
              href="/mother/login"
              className={`text-sm font-semibold transition-all px-4 py-2.5 rounded-lg cursor-pointer ${
                pathname === "/mother/login"
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg"
                  : pathname === "/mother/register"
                  ? "text-pink-600 border-2 border-pink-300 bg-transparent"
                  : "text-neutral-600 hover:text-pink-600 hover:bg-pink-50 border-2 border-transparent"
              }`}
            >
              {t.common.login}
            </Link>
            <Link
              href="/mother/register"
              className={`text-sm font-semibold transition-all px-4 py-2.5 rounded-lg cursor-pointer ${
                pathname === "/mother/register"
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg"
                  : pathname === "/mother/login"
                  ? "text-pink-600 border-2 border-pink-300 bg-transparent"
                  : "text-neutral-600 hover:text-pink-600 hover:bg-pink-50 border-2 border-transparent"
              }`}
            >
              {t.common.register}
            </Link>
          </>
        );
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col no-select">
      {/* Header - Enhanced Navigation */}
      <header className="bg-white/80 backdrop-blur-md border-b border-neutral-200 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-18">
            <Link href="/" className="flex items-center group active-scale tap-highlight-none">
              <div className="relative w-28 h-8 sm:w-40 sm:h-12 md:w-48 md:h-14 flex-shrink-0 transition-transform group-hover:scale-105">
                <Image
                  src="/mainlogo.png"
                  alt="MomsCare Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
            
            <div className="flex items-center gap-2">
              <nav className="hidden lg:flex items-center gap-1">
                {getNavItems()}
              </nav>
              
              {/* Language Toggle - Always visible in top right, outside nav */}
              <div className="flex-shrink-0 z-10 scale-90 sm:scale-100">
                <LanguageSelector />
              </div>
              
              {/* Mobile menu button - Show MobileDashboardMenu button on dashboards, otherwise show default */}
              {pathname.startsWith("/mother/dashboard") || 
               pathname.startsWith("/doctor/dashboard") || 
               pathname.startsWith("/admin/dashboard") ? (
                <div id="mobile-dashboard-menu-button-slot" className="lg:!hidden tap-highlight-none"></div>
              ) : (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-xl text-neutral-600 hover:bg-pink-50 hover:text-pink-600 transition-all active:scale-90 tap-highlight-none"
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
              )}
            </div>
            </div>
          </div>
          
          {/* Mobile menu - Hide on dashboards (handled by MobileDashboardMenu) */}
          {mobileMenuOpen && !pathname.startsWith("/mother/dashboard") && 
           !pathname.startsWith("/doctor/dashboard") && 
           !pathname.startsWith("/admin/dashboard") && (
          <nav className="lg:hidden bg-white/95 backdrop-blur-xl border-t border-neutral-100 p-4 flex flex-col gap-2 animate-slide-up">
              {getNavItems()}
            </nav>
          )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 lg:pb-0">
        {isHome ? (
          children
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        )}
      </main>

      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
