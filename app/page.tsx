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
      router.push("/doctor/login");
    }
  };

  return (
    <main className="min-h-screen">
      {/* Hero Section - Redesigned */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-rose-50 to-pink-50 pt-20 pb-16">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fce7f3' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col gap-12 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 space-y-6">
              <div className="inline-block rounded-full bg-white/80 backdrop-blur-sm px-5 py-2 shadow-md border border-pink-200">
                <p className="text-sm font-semibold uppercase tracking-wider text-pink-600">
                  MomsCare
                </p>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-neutral-800 leading-tight">
                {t.home.title}
              </h1>
              
              <p className="text-xl md:text-2xl text-neutral-600 leading-relaxed max-w-2xl">
                {t.home.subtitle}
              </p>
              
              <div className="flex flex-col gap-4 sm:flex-row pt-4">
                <Link
                  href="/chat"
                  className="btn-primary inline-flex items-center justify-center gap-3 text-lg px-8 py-4"
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Icon name="chat" size={24} className="brightness-0 invert" />
                  </div>
                  {t.home.chatButton}
                </Link>
                <button
                  onClick={handleMotherClick}
                  className="btn-secondary inline-flex items-center justify-center gap-3 text-lg px-8 py-4"
                >
                  <Icon name="mom" size={24} className="text-pink-600" />
                  {isMother ? "Go to Dashboard" : "I am Mother"}
                </button>
              </div>
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

      {/* Features Section - Redesigned */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-4">
              Why Choose MomsCare?
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Your trusted companion throughout your pregnancy journey
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: "ai", text: t.home.feature1, color: "from-purple-500 to-pink-500" },
              { icon: "doctor", text: t.home.feature2, color: "from-blue-500 to-cyan-500" },
              { icon: "secure", text: t.home.feature3, color: "from-green-500 to-emerald-500" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="group relative rounded-2xl bg-white border-2 border-neutral-200 p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-pink-300"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-shadow`}>
                  <Icon name={item.icon} size={32} className="text-white" />
                </div>
                <p className="text-sm font-semibold text-pink-600 mb-3 uppercase tracking-wide">Feature</p>
                <p className="text-base font-medium text-neutral-700 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Sections - Redesigned */}
      <section className="py-16 bg-gradient-to-br from-neutral-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Mothers Section */}
            <div className="group relative rounded-3xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 via-white to-rose-50 p-10 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:border-pink-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-200 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative">
                <div className="mb-6 flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg">
                  <Icon name="mom" size={48} className="text-white" />
                </div>
                <h3 className="mb-4 text-3xl font-bold text-neutral-800">{t.home.mothersTitle}</h3>
                <p className="mb-8 text-neutral-600 leading-relaxed text-lg">{t.home.mothersDesc}</p>
                <div className="flex flex-wrap gap-3">
                  {!isMother && (
                    <>
                      <Link
                        href="/mother/register"
                        className="btn-primary px-6 py-3"
                      >
                        {t.common.register}
                      </Link>
                      <button
                        onClick={handleMotherClick}
                        className="btn-secondary px-6 py-3"
                      >
                        {t.common.login}
                      </button>
                    </>
                  )}
                  {isMother && (
                    <button
                      onClick={handleMotherClick}
                      className="btn-primary px-6 py-3"
                    >
                      Go to Dashboard
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Doctors Section */}
            <div className="group relative rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-10 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:border-blue-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative">
                <div className="mb-6 flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                  <Icon name="doctor" size={48} className="text-white" />
                </div>
                <h3 className="mb-4 text-3xl font-bold text-neutral-800">{t.home.doctorsTitle}</h3>
                <p className="mb-8 text-neutral-600 leading-relaxed text-lg">{t.home.doctorsDesc}</p>
                <div className="flex flex-wrap gap-3">
                  {!isDoctor && (
                    <>
                      <Link
                        href="/doctor/register"
                        className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-blue-600 hover:to-cyan-600 hover:shadow-xl transform hover:scale-105 active:scale-95"
                      >
                        Apply
                      </Link>
                      <button
                        onClick={handleDoctorClick}
                        className="btn-secondary px-6 py-3 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                      >
                        Doctor {t.common.login}
                      </button>
                    </>
                  )}
                  {isDoctor && (
                    <button
                      onClick={handleDoctorClick}
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-blue-600 hover:to-cyan-600 hover:shadow-xl transform hover:scale-105 active:scale-95"
                    >
                      Go to Dashboard
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-neutral-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-neutral-500 text-sm">
            © {new Date().getFullYear()} MomsCare. All rights reserved.
          </p>
          <p className="text-neutral-400 text-xs mt-2">Made with care for mothers everywhere</p>
        </div>
      </footer>
    </main>
  );
}
