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

  useEffect(() => {
    const motherToken = localStorage.getItem("motherToken");
    const doctorToken = localStorage.getItem("doctorToken");
    setIsMother(!!motherToken);
    setIsDoctor(!!doctorToken);
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
    if (isDoctor) {
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
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-rose-50 to-pink-50 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fce7f3' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col gap-12 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 space-y-8">
              <div className="inline-block rounded-full bg-white/90 backdrop-blur-sm px-6 py-2.5 shadow-lg border-2 border-pink-300">
                <p className="text-sm font-bold uppercase tracking-wider text-pink-600">
                  Trusted Pregnancy Support Platform
                </p>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-neutral-900 leading-[1.1] tracking-tight">
                {t.home.title}
              </h1>
              
              <p className="text-lg sm:text-xl md:text-2xl text-neutral-700 leading-relaxed max-w-2xl font-medium">
                {t.home.subtitle}
              </p>
              
              <div className="flex flex-col gap-4 sm:flex-row pt-2">
                <Link
                  href="/chat"
                  className="group relative inline-flex items-center justify-center gap-3 text-lg font-bold px-10 py-5 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 hover:from-pink-700 hover:to-rose-700"
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Icon name="chat" size={24} className="brightness-0 invert" />
                  </div>
                  {t.home.chatButton}
                  <span className="text-sm font-normal opacity-90 ml-1">→</span>
                </Link>
                <button
                  onClick={handleMotherClick}
                  className="inline-flex items-center justify-center gap-3 text-lg font-semibold px-8 py-5 bg-white text-pink-600 rounded-2xl border-2 border-pink-300 shadow-lg hover:shadow-xl hover:bg-pink-50 transform hover:scale-105 transition-all duration-300"
                >
                  <Icon name="mom" size={24} className="text-pink-600" />
                  {isMother ? "Go to Dashboard" : "Get Started as a Mother"}
                </button>
              </div>
              
              <p className="text-sm text-neutral-600 pt-2">
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
      <section id="features" className="py-20 bg-white border-t border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-900 mb-4">
              Why Choose MomsCare?
            </h2>
            <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto font-medium">
              Your trusted companion throughout your pregnancy journey
            </p>
          </div>
          
          <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
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
                title: "Expert Doctors",
                description: "Connect with verified healthcare professionals for personalized guidance."
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
                className="group relative rounded-3xl bg-white border-2 border-neutral-200 p-8 sm:p-10 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:border-pink-300"
              >
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 shadow-xl group-hover:shadow-2xl transition-shadow transform group-hover:scale-110`}>
                  <Icon name={item.icon} size={40} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">{item.title}</h3>
                <p className="text-base text-neutral-600 leading-relaxed mb-4">{item.description}</p>
                <p className="text-sm font-medium text-neutral-700 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Sections - Enhanced with Clear Separation */}
      <section id="get-started" className="py-20 bg-gradient-to-br from-neutral-50 via-pink-50/50 to-neutral-50 border-t border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-900 mb-4">
              Get Started Today
            </h2>
            <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto font-medium">
              Choose your path and join thousands of mothers and doctors
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2">
            {/* Mothers Section */}
            <div className="group relative rounded-3xl border-2 border-pink-300 bg-gradient-to-br from-pink-50 via-white to-rose-50 p-10 sm:p-12 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:border-pink-400">
              <div className="absolute top-0 right-0 w-40 h-40 bg-pink-200 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative">
                <div className="mb-6 flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-xl">
                  <Icon name="mom" size={56} className="text-white" />
                </div>
                <h3 className="mb-4 text-3xl sm:text-4xl font-extrabold text-neutral-900">{t.home.mothersTitle}</h3>
                <p className="mb-8 text-base sm:text-lg text-neutral-700 leading-relaxed font-medium">{t.home.mothersDesc}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {!isMother && (
                    <>
                      <Link
                        href="/mother/login"
                        className="inline-flex items-center justify-center gap-2 text-base font-bold px-8 py-4 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 hover:from-pink-700 hover:to-rose-700"
                      >
                        Get Started as a Mother
                        <span className="text-lg">→</span>
                      </Link>
                      <Link
                        href="/mother/register"
                        className="inline-flex items-center justify-center text-base font-semibold px-8 py-4 bg-white text-pink-600 rounded-xl border-2 border-pink-300 shadow-md hover:shadow-lg hover:bg-pink-50 transform hover:scale-105 transition-all duration-300"
                      >
                        Create Account
                      </Link>
                    </>
                  )}
                  {isMother && (
                    <button
                      onClick={handleMotherClick}
                      className="inline-flex items-center justify-center gap-2 text-base font-bold px-8 py-4 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                      Go to Dashboard
                      <span className="text-lg">→</span>
                    </button>
                  )}
                </div>
                <p className="text-sm text-neutral-600 mt-4">
                  ✓ Free registration • ✓ Track your pregnancy • ✓ Get expert answers
                </p>
              </div>
            </div>

            {/* Doctors Section */}
            <div className="group relative rounded-3xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-10 sm:p-12 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:border-blue-400">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-200 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative">
                <div className="mb-6 flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-xl">
                  <Icon name="doctor" size={56} className="text-white" />
                </div>
                <h3 className="mb-4 text-3xl sm:text-4xl font-extrabold text-neutral-900">{t.home.doctorsTitle}</h3>
                <p className="mb-8 text-base sm:text-lg text-neutral-700 leading-relaxed font-medium">{t.home.doctorsDesc}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {!isDoctor && (
                    <>
                      <Link
                        href="/doctor/register"
                        className="inline-flex items-center justify-center gap-2 text-base font-bold px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 hover:from-blue-700 hover:to-cyan-700"
                      >
                        Become a Verified Doctor
                        <span className="text-lg">→</span>
                      </Link>
                      <Link
                        href="/doctor/login"
                        className="inline-flex items-center justify-center text-base font-semibold px-8 py-4 bg-white text-blue-600 rounded-xl border-2 border-blue-300 shadow-md hover:shadow-lg hover:bg-blue-50 transform hover:scale-105 transition-all duration-300"
                      >
                        Doctor {t.common.login}
                      </Link>
                    </>
                  )}
                  {isDoctor && (
                    <button
                      onClick={handleDoctorClick}
                      className="inline-flex items-center justify-center gap-2 text-base font-bold px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                      Go to Dashboard
                      <span className="text-lg">→</span>
                    </button>
                  )}
                </div>
                <p className="text-sm text-neutral-600 mt-4">
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
                    For Doctors
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
