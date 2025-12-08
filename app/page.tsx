"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTranslations } from "@/lib/i18n";
import Icon from "@/components/Icon";
import { Illustration } from "@/components/Icon";

export default function Home() {
  const [t] = useState(getTranslations("en"));
  const router = useRouter();
  const [isMother, setIsMother] = useState(false);
  const [isDoctor, setIsDoctor] = useState(false);
  const [isNurse, setIsNurse] = useState(false);
  const [userRole, setUserRole] = useState<"doctor" | "nurse" | "others" | null>(null);

  useEffect(() => {
    const motherToken = localStorage.getItem("motherToken");
    const doctorToken = localStorage.getItem("doctorToken");
    setIsMother(!!motherToken);
    setIsDoctor(!!doctorToken);
    
    // Check if doctor token belongs to nurse/others
    if (doctorToken) {
      const checkRole = async () => {
        try {
          const res = await fetch("/api/doctor/profile", {
            headers: { Authorization: `Bearer ${doctorToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            const role = data.profile?.role;
            if (role === "nurse" || role === "others") {
              setIsNurse(true);
              setIsDoctor(false);
              setUserRole(role);
            } else {
              setIsNurse(false);
              setIsDoctor(true);
              setUserRole("doctor");
            }
          }
        } catch {
          setIsNurse(false);
        }
      };
      checkRole();
    }
  }, []);

  const handleMotherClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isMother) {
      router.push("/mother/dashboard");
    } else {
      router.push("/mother/login");
    }
  };

  const handleDoctorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isNurse) {
      router.push("/nurse/dashboard");
    } else if (isDoctor) {
      router.push("/doctor/dashboard");
    } else {
      router.push("/doctor/register");
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <main className="min-h-screen">
      {/* Hero Section - Enhanced Visual Hierarchy */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-rose-50 to-pink-50 pt-16 pb-12 sm:pt-20 sm:pb-16 md:pt-28 md:pb-24 lg:pt-32 lg:pb-28">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fce7f3' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col gap-8 sm:gap-10 md:gap-12 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 space-y-6 sm:space-y-7 md:space-y-8">
              <div className="inline-block rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-2.5 shadow-lg border-2 border-pink-300">
                <p className="text-[10px] xs:text-xs sm:text-sm font-bold uppercase tracking-wider text-pink-600 leading-tight">
                  Trusted Pregnancy Support Platform
                </p>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-neutral-900 leading-[1.1] tracking-tight">
                {t.home.title}
              </h1>
              
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-neutral-700 leading-relaxed max-w-2xl font-medium">
                {t.home.subtitle}
              </p>
              
              <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row pt-1 sm:pt-2">
                <Link
                  href="/chat"
                  className="group relative inline-flex items-center justify-center gap-2 sm:gap-3 text-base sm:text-lg font-bold px-6 py-3.5 sm:px-8 sm:py-4 md:px-10 md:py-5 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 hover:from-pink-700 hover:to-rose-700"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                    <Icon name="chat" size={20} className="sm:w-6 sm:h-6 brightness-0 invert" />
                  </div>
                  <span className="whitespace-nowrap">{t.home.chatButton}</span>
                  <span className="text-xs sm:text-sm font-normal opacity-90 ml-1">→</span>
                </Link>
                <button
                  onClick={handleMotherClick}
                  className="inline-flex items-center justify-center gap-2 sm:gap-3 text-base sm:text-lg font-semibold px-6 py-3.5 sm:px-8 sm:py-4 md:px-8 md:py-5 bg-white text-pink-600 rounded-xl sm:rounded-2xl border-2 border-pink-300 shadow-lg hover:shadow-xl hover:bg-pink-50 transform hover:scale-105 transition-all duration-300"
                >
                  <Icon name="mom" size={20} className="sm:w-6 sm:h-6 text-pink-600" />
                  <span className="whitespace-nowrap text-sm sm:text-base md:text-lg">{isMother ? "Go to Dashboard" : "Get Started as a Mother"}</span>
                </button>
              </div>
              
              <p className="text-xs sm:text-sm text-neutral-600 pt-1 sm:pt-2 leading-relaxed">
                ✨ Free to use • No credit card required • Trusted by thousands of mothers
              </p>
            </div>
            
            <div className="hidden md:block flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-200 to-rose-200 rounded-3xl transform rotate-6 opacity-20"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-pink-100">
                  <Illustration name="pregnant-woman" width={300} height={300} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Enhanced with Cards */}
      <section id="features" className="py-12 sm:py-16 md:py-20 bg-white border-t border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-neutral-900 mb-3 sm:mb-4">
              Why Choose MomsCare?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-neutral-600 max-w-2xl mx-auto font-medium px-2">
              Your trusted companion throughout your pregnancy journey
            </p>
          </div>
          
          <div className="grid gap-4 sm:gap-6 md:gap-8 md:grid-cols-3">
            {[
              { 
                icon: "ai", 
                text: t.home.feature1, 
                color: "from-purple-500 to-pink-500",
                title: "AI-Powered Support",
                description: "Get instant, reliable answers to your pregnancy questions, 24/7."
              },
              { 
                icon: "doctor", 
                text: t.home.feature2, 
                color: "from-blue-500 to-cyan-500",
                title: "Expert Health Workers",
                description: "Connect with verified healthcare professionals including doctors, nurses, and health workers."
              },
              { 
                icon: "secure", 
                text: t.home.feature3, 
                color: "from-green-500 to-emerald-500",
                title: "Secure & Private",
                description: "Your data is encrypted and stored securely. Your privacy matters."
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="group relative rounded-2xl sm:rounded-3xl bg-white border-2 border-neutral-200 p-5 sm:p-6 md:p-8 lg:p-10 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:border-pink-300"
              >
                <div className={`w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 sm:mb-5 md:mb-6 shadow-xl group-hover:shadow-2xl transition-shadow transform group-hover:scale-110`}>
                  <Icon name={item.icon} size={32} className="sm:w-9 sm:h-9 md:w-10 md:h-10 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-neutral-900 mb-2">{item.title}</h3>
                <p className="text-sm sm:text-base text-neutral-600 leading-relaxed mb-3 sm:mb-4">{item.description}</p>
                <p className="text-xs sm:text-sm font-medium text-neutral-700 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Sections - Enhanced with Clear Separation */}
      <section id="get-started" className="py-20 bg-gradient-to-br from-neutral-50 via-pink-50/50 to-neutral-50 border-t border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-neutral-900 mb-3 sm:mb-4">
              Get Started Today
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-neutral-600 max-w-2xl mx-auto font-medium px-2">
              Choose your path and join thousands of mothers and health workers
            </p>
          </div>
          
          <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
            {/* Mothers Section */}
            <div className="group relative rounded-2xl sm:rounded-3xl border-2 border-pink-300 bg-gradient-to-br from-pink-50 via-white to-rose-50 p-6 sm:p-8 md:p-10 lg:p-12 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:border-pink-400">
              <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 bg-pink-200 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative">
                <div className="mb-4 sm:mb-5 md:mb-6 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-xl">
                  <Icon name="mom" size={40} className="sm:w-12 sm:h-12 md:w-14 md:h-14 text-white" />
                </div>
                <h3 className="mb-3 sm:mb-4 text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900">{t.home.mothersTitle}</h3>
                <p className="mb-6 sm:mb-7 md:mb-8 text-sm sm:text-base md:text-lg text-neutral-700 leading-relaxed font-medium">{t.home.mothersDesc}</p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {!isMother && (
                    <>
                      <Link
                        href="/mother/login"
                        className="inline-flex items-center justify-center gap-2 text-sm sm:text-base font-bold px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 hover:from-pink-700 hover:to-rose-700"
                      >
                        <span className="whitespace-nowrap">Get Started as a Mother</span>
                        <span className="text-base sm:text-lg">→</span>
                      </Link>
                      <Link
                        href="/mother/register"
                        className="inline-flex items-center justify-center text-sm sm:text-base font-semibold px-6 py-3 sm:px-8 sm:py-4 bg-white text-pink-600 rounded-lg sm:rounded-xl border-2 border-pink-300 shadow-md hover:shadow-lg hover:bg-pink-50 transform hover:scale-105 transition-all duration-300"
                      >
                        <span className="whitespace-nowrap">Create Account</span>
                      </Link>
                    </>
                  )}
                  {isMother && (
                    <button
                      onClick={handleMotherClick}
                      className="inline-flex items-center justify-center gap-2 text-sm sm:text-base font-bold px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                      <span className="whitespace-nowrap">Go to Dashboard</span>
                      <span className="text-base sm:text-lg">→</span>
                    </button>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-neutral-600 mt-3 sm:mt-4">
                  ✓ Free registration • ✓ Track your pregnancy • ✓ Get expert answers
                </p>
              </div>
            </div>

            {/* Doctors Section */}
            <div className="group relative rounded-2xl sm:rounded-3xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 sm:p-8 md:p-10 lg:p-12 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:border-blue-400">
              <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 bg-blue-200 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative">
                <div className="mb-4 sm:mb-5 md:mb-6 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-xl">
                  <Icon name="nurse" size={40} className="sm:w-12 sm:h-12 md:w-14 md:h-14 text-white" />
                </div>
                <h3 className="mb-3 sm:mb-4 text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900">{t.home.doctorsTitle}</h3>
                <p className="mb-6 sm:mb-7 md:mb-8 text-sm sm:text-base md:text-lg text-neutral-700 leading-relaxed font-medium">{t.home.doctorsDesc}</p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {(!isDoctor && !isNurse) && (
                    <>
                      <Link
                        href="/healthworker/register"
                        className="inline-flex items-center justify-center gap-2 text-sm sm:text-base font-bold px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 hover:from-blue-700 hover:to-cyan-700"
                      >
                        <span className="whitespace-nowrap">Join as Health Worker</span>
                        <span className="text-base sm:text-lg">→</span>
                      </Link>
                      <Link
                        href="/healthworker/login"
                        className="inline-flex items-center justify-center text-sm sm:text-base font-semibold px-6 py-3 sm:px-8 sm:py-4 bg-white text-blue-600 rounded-lg sm:rounded-xl border-2 border-blue-300 shadow-md hover:shadow-lg hover:bg-blue-50 transform hover:scale-105 transition-all duration-300"
                      >
                        <span className="whitespace-nowrap">Health Worker {t.common.login}</span>
                      </Link>
                    </>
                  )}
                  {(isDoctor || isNurse) && (
                    <button
                      onClick={handleDoctorClick}
                      className="inline-flex items-center justify-center gap-2 text-sm sm:text-base font-bold px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                      <span className="whitespace-nowrap">Go to Dashboard</span>
                      <span className="text-base sm:text-lg">→</span>
                    </button>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-neutral-600 mt-3 sm:mt-4">
                  ✓ Quick approval process • ✓ Help mothers in need • ✓ Build your reputation
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Enhanced with Links */}
      <footer className="bg-neutral-900 text-neutral-300 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-2xl font-bold text-white">MomsCare</span>
              </div>
              <p className="text-neutral-400 text-sm leading-relaxed max-w-md">
                Your trusted companion throughout your pregnancy journey. Get expert guidance, track your progress, and connect with verified healthcare professionals.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">For Users</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/mother/register" className="text-neutral-400 hover:text-pink-400 text-sm transition-colors">
                    For Mothers
                  </Link>
                </li>
                <li>
                  <Link href="/doctor/register" className="text-neutral-400 hover:text-blue-400 text-sm transition-colors">
                    For Health Workers
                  </Link>
                </li>
                <li>
                  <Link href="/chat" className="text-neutral-400 hover:text-pink-400 text-sm transition-colors">
                    AI Chat
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection("features"); }} className="text-neutral-400 hover:text-pink-400 text-sm transition-colors cursor-pointer">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#get-started" onClick={(e) => { e.preventDefault(); scrollToSection("get-started"); }} className="text-neutral-400 hover:text-pink-400 text-sm transition-colors cursor-pointer">
                    Get Started
                  </a>
                </li>
                <li>
                  <Link href="/privacy" className="text-neutral-400 hover:text-pink-400 text-sm transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-neutral-800 pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-neutral-500 text-sm">
                © {new Date().getFullYear()} MomsCare. All rights reserved.
              </p>
              <p className="text-neutral-500 text-sm">
                Made with ❤️ for mothers everywhere
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
