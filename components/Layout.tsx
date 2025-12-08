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
  const [isNurse, setIsNurse] = useState(false);
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
    
    // Check if doctor token belongs to nurse/others
    if (doctorToken) {
      const checkNurseRole = async () => {
        try {
          const res = await fetch("/api/doctor/profile", {
            headers: { Authorization: `Bearer ${doctorToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.profile?.role === "nurse" || data.profile?.role === "others") {
              setIsNurse(true);
              setIsDoctor(false);
            } else {
              setIsNurse(false);
              setIsDoctor(true);
            }
          }
        } catch {
          setIsNurse(false);
        }
      };
      checkNurseRole();
    }

    // Redirect logged-in users to their dashboards if on home page
    if (isHome) {
      if (motherToken) {
        router.push("/mother/dashboard");
        return;
      } else if (doctorToken) {
        // Check role from token to route correctly
        const checkRoleAndRoute = async () => {
          try {
            const res = await fetch("/api/doctor/profile", {
              headers: { Authorization: `Bearer ${doctorToken}` }
            });
            if (res.ok) {
              const data = await res.json();
              if (data.profile?.role === "nurse" || data.profile?.role === "others") {
                router.push("/nurse/dashboard");
              } else {
                router.push("/doctor/dashboard");
              }
            } else {
              router.push("/doctor/dashboard");
            }
          } catch {
            router.push("/doctor/dashboard");
          }
        };
        checkRoleAndRoute();
        return;
      } else if (adminToken) {
        router.push("/admin/dashboard");
        return;
      }
    }
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
            Dashboard
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
            Chat
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem("motherToken");
              location.href = "/";
            }}
            className="font-medium transition-colors px-4 py-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Logout
          </button>
        </>
      );
    } else if (isNurse) {
      // Logged in as nurse - show full navigation
      return (
        <>
          <Link
            href="/nurse/dashboard"
            className={`font-medium transition-colors px-4 py-2 rounded-lg ${
              pathname === "/nurse/dashboard"
                ? "text-blue-600 bg-blue-50 font-semibold"
                : "text-neutral-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/nurse/dashboard"
            className={`font-medium transition-colors px-4 py-2 rounded-lg ${
              pathname === "/nurse/dashboard"
                ? "text-blue-600 bg-blue-50 font-semibold"
                : "text-neutral-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            Manage Patients
          </Link>
          <Link
            href="/nurse/profile"
            className={`font-medium transition-colors px-4 py-2 rounded-lg ${
              pathname === "/nurse/profile"
                ? "text-blue-600 bg-blue-50 font-semibold"
                : "text-neutral-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            Profile
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem("doctorToken");
              location.href = "/";
            }}
            className="font-medium transition-colors px-4 py-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Logout
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
            Dashboard
          </Link>
          <Link
            href="/doctor/dashboard"
            className={`font-medium transition-colors px-4 py-2 rounded-lg ${
              pathname === "/doctor/dashboard"
                ? "text-blue-600 bg-blue-50 font-semibold"
                : "text-neutral-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            Q&A
          </Link>
          <Link
            href="/doctor/profile"
            className={`font-medium transition-colors px-4 py-2 rounded-lg ${
              pathname === "/doctor/profile"
                ? "text-blue-600 bg-blue-50 font-semibold"
                : "text-neutral-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            Profile
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem("doctorToken");
              location.href = "/";
            }}
            className="font-medium transition-colors px-4 py-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Logout
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
              Home
            </Link>
            <a
              href="#get-started"
              onClick={(e) => { e.preventDefault(); scrollToSection("get-started"); }}
              className="font-medium transition-colors px-3 py-2 rounded-lg text-neutral-600 hover:text-pink-600 cursor-pointer"
            >
              For Mothers
            </a>
            <a
              href="#get-started"
              onClick={(e) => { e.preventDefault(); scrollToSection("get-started"); }}
              className="font-medium transition-colors px-3 py-2 rounded-lg text-neutral-600 hover:text-blue-600 cursor-pointer"
            >
              For Health Workers
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
              Chat
            </Link>
            <Link
              href="/mother/login"
              className="text-sm font-semibold transition-all px-4 py-2.5 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md hover:shadow-lg transform hover:scale-105"
            >
              Login
            </Link>
          </>
        );
      } else if (pathname.startsWith("/doctor")) {
        // Doctor context
        return (
          <>
            <Link
              href="/"
              className="font-medium transition-colors px-3 py-2 rounded-lg text-neutral-600 hover:text-pink-600"
            >
              Home
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
              MomsCare AI Chat
            </Link>
            <Link
              href="/doctor/login"
              className={`text-sm font-semibold transition-all px-4 py-2.5 rounded-lg cursor-pointer ${
                pathname === "/doctor/login"
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg"
                  : pathname === "/doctor/register"
                  ? "text-pink-600 border-2 border-pink-300 bg-transparent"
                  : "text-neutral-600 hover:text-pink-600 hover:bg-pink-50 border-2 border-transparent"
              }`}
            >
              Login
            </Link>
            <Link
              href="/doctor/register"
              className={`text-sm font-semibold transition-all px-4 py-2.5 rounded-lg cursor-pointer ${
                pathname === "/doctor/register"
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg"
                  : pathname === "/doctor/login"
                  ? "text-pink-600 border-2 border-pink-300 bg-transparent"
                  : "text-neutral-600 hover:text-pink-600 hover:bg-pink-50 border-2 border-transparent"
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
              href="/"
              className="font-medium transition-colors px-3 py-2 rounded-lg text-neutral-600 hover:text-pink-600"
            >
              Home
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
              MomsCare AI Chat
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
              Login
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
              Register
            </Link>
          </>
        );
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - Enhanced Navigation */}
      <header className="bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-md sticky top-0 z-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center justify-between h-16 md:h-18">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <span className="text-white font-bold text-base sm:text-lg">M</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold gradient-text">MomsCare</span>
            </Link>
            
            <nav className="hidden lg:flex items-center gap-1">
              {getNavItems()}
            </nav>
            
            {/* Mobile menu button - Show MobileDashboardMenu button on dashboards, otherwise show default */}
            {pathname.startsWith("/mother/dashboard") || 
             pathname.startsWith("/doctor/dashboard") || 
             pathname.startsWith("/nurse/dashboard") ||
             pathname.startsWith("/admin/dashboard") ? (
              <div id="mobile-dashboard-menu-button-slot" className="lg:!hidden"></div>
            ) : (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-neutral-600 hover:bg-pink-50 hover:text-pink-600 transition-colors"
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
          
          {/* Mobile menu - Hide on dashboards (handled by MobileDashboardMenu) */}
          {mobileMenuOpen && !pathname.startsWith("/mother/dashboard") && 
           !pathname.startsWith("/doctor/dashboard") && 
           !pathname.startsWith("/nurse/dashboard") && 
           !pathname.startsWith("/admin/dashboard") && (
            <nav className="lg:hidden mt-4 pb-4 border-t border-neutral-200 pt-4 flex flex-col gap-2">
              {getNavItems()}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {isHome ? (
          children
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        )}
      </main>

    </div>
  );
}
