"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import Icon from "@/components/Icon";
import { Illustration } from "@/components/Icon";
import Layout from "@/components/Layout";

export default function Home() {
  const t = useTranslation();
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
    <Layout>
    <main className="min-h-screen">
      {/* Hero Section - Professional & Modern */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-rose-100 to-pink-50 pt-12 pb-16 sm:pt-16 sm:pb-20 md:pt-20 md:pb-24 lg:pt-24 lg:pb-32 min-h-[85vh] flex items-center">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm66 3c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-46-73c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm0 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ec4899' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}></div>
        </div>
        
        {/* Animated Background Blobs */}
        <div className="absolute top-0 -left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-20 w-72 h-72 bg-rose-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/2 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
            <div className="flex-1 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-md px-4 py-2 shadow-sm border border-pink-200">
                <span className="flex h-2 w-2 rounded-full bg-pink-500 animate-pulse"></span>
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-pink-600">
                  {t.home.trustedPlatform}
                </p>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-neutral-900 leading-[1.05] tracking-tight">
                Your 24/7 AI Companion for a <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-rose-600">Healthy Pregnancy</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-neutral-800 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium opacity-90">
                Experience personalized care, expert guidance, and smart tools designed to support you every step of your journey—from conception to birth.
              </p>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-4 pt-4 w-full sm:w-auto px-4 sm:px-0">
                {/* Primary Action */}
                <button
                  onClick={handleMotherClick}
                  className="group relative flex-1 sm:flex-none inline-flex items-center justify-center gap-3 text-lg font-black px-10 py-5 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-[1.5rem] shadow-[0_20px_40px_rgba(225,29,72,0.2)] hover:shadow-[0_25px_50px_rgba(225,29,72,0.3)] transform hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 tap-highlight-none overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                  <Icon name="mom" size={24} className="brightness-0 invert relative z-10" />
                  <span className="whitespace-nowrap relative z-10">{isMother ? "Go to Dashboard" : "Start Your Journey"}</span>
                  <span className="group-hover:translate-x-1 transition-transform relative z-10">→</span>
                </button>
                
                {/* Secondary Actions Row */}
                <div className="flex flex-row gap-3 flex-1 sm:flex-none">
                <Link
                  href="/chat"
                    className="flex-1 inline-flex items-center justify-center gap-2 text-base font-bold px-6 py-5 bg-white/80 backdrop-blur-md text-neutral-900 rounded-[1.5rem] border border-neutral-200/60 shadow-lg shadow-neutral-200/20 hover:border-pink-300 hover:bg-pink-50/50 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 tap-highlight-none"
                >
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                      <Icon name="chat" size={18} className="text-pink-600" />
                    </div>
                    <span className="whitespace-nowrap">AI Chat</span>
                  </Link>

                  <Link
                    href="/risk-detection"
                    className="flex-1 inline-flex items-center justify-center gap-2 text-base font-bold px-6 py-5 bg-rose-50/80 backdrop-blur-md text-rose-700 rounded-[1.5rem] border border-rose-200/60 shadow-lg shadow-rose-200/20 hover:border-rose-400 hover:bg-rose-100/50 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 tap-highlight-none"
                  >
                    <div className="w-8 h-8 rounded-full bg-rose-200/50 flex items-center justify-center">
                      <Icon name="health" size={18} className="text-rose-600" />
                    </div>
                    <span className="whitespace-nowrap">Check Risk</span>
                </Link>
                </div>
              </div>

              <div className="flex flex-wrap justify-center lg:justify-start items-center gap-6 pt-4">
                <p className="text-sm font-bold text-neutral-600 uppercase tracking-widest w-full lg:w-auto mb-2 lg:mb-0">Empowering Mothers Worldwide</p>
                <div className="flex gap-4">
                  <span className="h-8 w-px bg-neutral-300 hidden sm:block"></span>
                  <p className="text-sm font-black text-neutral-800">✓ Personalized</p>
                  <p className="text-sm font-black text-neutral-800">✓ Secure</p>
                  <p className="text-sm font-black text-neutral-800">✓ 24/7 Support</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 relative lg:max-w-md">
              <div className="relative z-10 animate-float">
                <div className="absolute -inset-4 bg-gradient-to-br from-pink-400 to-rose-400 rounded-[2.5rem] transform rotate-3 opacity-10 blur-xl"></div>
                <div className="relative bg-white rounded-[2.5rem] p-4 sm:p-5 shadow-2xl border border-pink-50">
                  <Illustration name="pregnant-woman" width={400} height={400} className="rounded-2xl" />
                  
                  {/* Floating Action Cards */}
                  <div className="absolute -left-4 sm:-left-8 top-1/4 bg-white p-3 rounded-2xl shadow-xl border border-pink-100 animate-float-slow">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-600 text-lg font-bold">✓</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-neutral-900 leading-tight">Health Tracked</p>
                        <p className="text-[8px] text-neutral-500">Updated now</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute -right-4 sm:-right-6 bottom-1/4 bg-white p-3 rounded-2xl shadow-xl border border-pink-100 animate-float-delayed">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                        <Icon name="chat" size={16} className="text-pink-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-neutral-900 leading-tight">AI Assistant</p>
                        <p className="text-[8px] text-neutral-500">Ready to help</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Feature: Early Risk Detection */}
      <section className="py-24 bg-gradient-to-b from-pink-50/50 to-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-rose-50/50 to-transparent pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1 order-2 lg:order-1">
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-br from-rose-500 to-pink-600 rounded-[3rem] opacity-10 blur-2xl group-hover:opacity-20 transition duration-700"></div>
                <div className="relative bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-2xl border border-rose-100 overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16"></div>
                  
                  <div className="space-y-8 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shadow-inner">
                        <Icon name="health" size={32} />
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-neutral-900 tracking-tight">AI Risk Assessment</h4>
                        <p className="text-rose-600 font-bold text-xs uppercase tracking-widest">Medical Grade Accuracy</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-start gap-4 hover:border-rose-200 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-rose-500 font-bold shrink-0">1</div>
                        <p className="text-neutral-700 text-sm leading-relaxed font-medium">Identify potential complications like Pre-eclampsia or Gestational Diabetes early through smart symptom analysis.</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-start gap-4 hover:border-rose-200 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-rose-500 font-bold shrink-0">2</div>
                        <p className="text-neutral-700 text-sm leading-relaxed font-medium">Answer a clinically-validated 10-question assessment based on global maternal health standards.</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-start gap-4 hover:border-rose-200 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-rose-500 font-bold shrink-0">3</div>
                        <p className="text-neutral-700 text-sm leading-relaxed font-medium">Receive instant risk level insights (Low, Medium, or High) with clear next steps and doctor recommendations.</p>
                      </div>
                    </div>
                    
                    <Link
                      href="/risk-detection"
                      className="w-full inline-flex items-center justify-center gap-3 font-black px-8 py-5 bg-neutral-900 text-white rounded-2xl hover:bg-neutral-800 transition-all shadow-xl active:scale-95 tap-highlight-none"
                    >
                      Start Free Assessment
                      <span className="text-xl">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 space-y-8 order-1 lg:order-2 text-center lg:text-left">
              <div className="inline-block px-4 py-2 bg-rose-100 text-rose-700 rounded-xl font-bold text-xs uppercase tracking-[0.2em]">Core Feature</div>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-neutral-900 leading-[1.1] tracking-tight">
                Early Risk Detection <br />
                <span className="text-rose-600 italic">Always Active.</span>
              </h3>
              <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed font-medium">
                Our advanced AI-driven screening tool constantly monitors your health data. Whether you're online or offline, it intelligently tracks risks based on all your symptoms and logs.
              </p>
              
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="space-y-2">
                  <div className="text-3xl font-black text-neutral-900 tracking-tight">Hybrid</div>
                  <p className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Online & Offline</p>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-black text-neutral-900 tracking-tight">24/7</div>
                  <p className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Continuous Tracking</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start pt-4">
                {["BP Tracking", "Glucose Risk", "Symptom Checker", "Emergency Direct"].map((tag, i) => (
                  <span key={i} className="px-4 py-2 bg-white border border-neutral-200 rounded-full text-xs font-bold text-neutral-600 shadow-sm hover:border-rose-300 transition-colors">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why MomsCare? - Benefits Focused Section */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-6">
              <h2 className="text-pink-600 font-bold tracking-widest uppercase text-sm">Why MomsCare?</h2>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-900 leading-tight">
                Experience Peace of Mind Throughout Your Journey
              </h3>
              <p className="text-lg text-neutral-600 leading-relaxed">
                MomsCare isn't just a tracker—it's your intelligent health companion. We blend advanced AI with clinical expertise to ensure you have everything you need for a safe and happy pregnancy.
              </p>
              
              <div className="space-y-4 pt-4">
                {[
                  { title: "Continuous Risk Monitoring", desc: "Our AI constantly analyzes your health logs and symptoms to detect risks early, online or offline.", icon: "health" },
                  { title: "Personalized AI Responses", desc: "Our AI understands your specific health profile and pregnancy stage.", icon: "ai" },
                  { title: "Secure Health Records", desc: "Keep all your prescriptions and medical history in one encrypted vault.", icon: "secure" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-pink-50 transition-colors">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                      <Icon name={item.icon} size={24} className="text-pink-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-900">{item.title}</h4>
                      <p className="text-sm text-neutral-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="lg:w-1/2 grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-12">
                <div className="aspect-square bg-pink-100 rounded-3xl p-8 flex flex-col justify-end shadow-sm">
                  <p className="text-4xl font-bold text-pink-600 mb-2">24/7</p>
                  <p className="font-bold text-neutral-800">Support Availability</p>
                </div>
                <div className="aspect-video bg-neutral-900 rounded-3xl p-8 flex flex-col justify-end text-white shadow-xl">
                  <p className="text-2xl font-bold mb-1">Instant</p>
                  <p className="text-sm text-neutral-400">Response Time</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="aspect-[3/4] bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-8 flex flex-col justify-end text-white shadow-xl">
                  <p className="text-4xl font-bold mb-2">100%</p>
                  <p className="font-bold">Private & Secure</p>
                </div>
                <div className="aspect-square bg-neutral-100 rounded-3xl p-8 flex flex-col justify-end shadow-sm">
                  <Icon name="doctor" size={40} className="text-neutral-800 mb-4" />
                  <p className="font-bold text-neutral-800">Expert Verified</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Medical Safety Section */}
      <section className="py-20 bg-neutral-900 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="md:w-1/3 text-center md:text-left space-y-4">
              <div className="inline-block p-3 rounded-2xl bg-white/10 mb-4">
                <Icon name="secure" size={32} className="brightness-0 invert" />
              </div>
              <h4 className="text-2xl font-bold !text-white">Medical Grade Privacy</h4>
              <p className="!text-neutral-300">Your health data is encrypted at rest and in transit. We never share your personal information.</p>
            </div>
            
            <div className="md:w-1/3 text-center md:text-left space-y-4">
              <div className="inline-block p-3 rounded-2xl bg-white/10 mb-4">
                <Icon name="doctor" size={32} className="brightness-0 invert" />
              </div>
              <h4 className="text-2xl font-bold !text-white">Expert-Reviewed AI</h4>
              <p className="!text-neutral-300">Our AI model is fine-tuned with verified pregnancy datasets and reviewed by healthcare professionals.</p>
            </div>
            
            <div className="md:w-1/3 text-center md:text-left space-y-4">
              <div className="inline-block p-3 rounded-2xl bg-white/10 mb-4">
                <Icon name="health" size={32} className="brightness-0 invert" />
              </div>
              <h4 className="text-2xl font-bold !text-white">Emergency Aware</h4>
              <p className="!text-neutral-300">The system intelligently recognizes emergency signs and directs you to immediate professional help.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tools for Mothers - Interactive Features Section */}
      <section id="features" className="py-24 bg-neutral-50 border-y border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-pink-600 font-bold tracking-widest uppercase text-sm mb-4">Powerful Tools</h2>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-neutral-900 mb-6">Everything You Need to Succeed</h3>
            <p className="text-lg text-neutral-600 font-medium">
              We've built a suite of professional-grade tools designed specifically for expectant mothers. Simple to use, but incredibly powerful.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                title: "AI Health Assistant", 
                desc: "Get instant, personalized pregnancy guidance powered by advanced AI—available anytime, anywhere.",
                icon: "ai", 
                badge: "AI Powered"
              },
              { 
                title: "Smart Routine AI", 
                desc: "Personalized meal plans and safe exercises tailored to your trimester, location, and health profile.",
                icon: "smart-routine-ai",
                badge: "Personalized"
              },
              { 
                title: "Smart Health Journal", 
                desc: "Track symptoms, mood, sleep, and diet. Our AI analyzes your data to identify health patterns.",
                icon: "smart-health-journal",
                badge: "Smart Tracking"
              },
              { 
                title: "Prescription & Report Vault", 
                desc: "Securely store medical documents. Our AI analyzes reports to help you understand your health better.",
                icon: "secure", 
                badge: "Secure"
              },
              { 
                title: "Risk Detection Tool", 
                desc: "Always-active hybrid tool for early detection of potential pregnancy risks, working seamlessly online and offline.",
                icon: "health",
                badge: "Core Feature",
                highlight: true
              },
              { 
                title: "Doctor Directory", 
                desc: "Find and connect with verified gynecologists in your local area with our real-time search tool.",
                icon: "doctor",
                badge: "Connected"
              }
            ].map((tool, idx) => (
              <div
                key={idx}
                className={`group p-6 sm:p-8 rounded-[2rem] border transition-all duration-500 hover:-translate-y-2 active:scale-95 tap-highlight-none ${
                  tool.highlight 
                    ? "bg-rose-50/50 border-rose-200 shadow-xl shadow-rose-900/5 hover:border-rose-400 hover:bg-rose-50" 
                    : "bg-white border-neutral-200 shadow-sm hover:shadow-2xl hover:border-pink-200"
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-all duration-500 shadow-sm ${
                    tool.highlight ? "bg-rose-600 text-white" : "bg-pink-50 text-pink-600 group-hover:bg-pink-600 group-hover:text-white"
                  }`}>
                    <Icon name={tool.icon} size={32} className={`${tool.highlight ? "brightness-0 invert" : "transition-colors"}`} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-colors ${
                    tool.highlight ? "bg-rose-600 text-white" : "bg-neutral-100 text-neutral-500 group-hover:bg-pink-100 group-hover:text-pink-600"
                  }`}>{tool.badge}</span>
                </div>
                <h4 className={`text-xl font-black mb-3 tracking-tight transition-colors ${
                  tool.highlight ? "text-neutral-900 group-hover:text-rose-700" : "text-neutral-900 group-hover:text-pink-600"
                }`}>{tool.title}</h4>
                <p className="text-neutral-600 leading-relaxed text-sm mb-6 opacity-80 group-hover:opacity-100 transition-opacity">{tool.desc}</p>
                <div className={`h-1.5 w-12 transition-all duration-700 rounded-full overflow-hidden ${
                  tool.highlight ? "bg-rose-200 group-hover:w-full" : "bg-pink-100 group-hover:w-full"
                }`}>
                  <div className={`h-full transition-all duration-1000 delay-100 w-0 group-hover:w-full ${
                    tool.highlight ? "bg-rose-600" : "bg-pink-500"
                  }`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three Steps to Better Care */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-pink-600 font-bold tracking-widest uppercase text-sm mb-4">The Process</h2>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900 leading-tight">Three Steps to Better Care</h3>
          </div>
          
          <div className="relative">
            {/* Connection Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-pink-100 to-transparent -translate-y-1/2"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
              {[
                { step: "01", title: "Quick Registration", desc: "Create your secure profile in seconds and tell us about your journey.", icon: "profile" },
                { step: "02", title: "Smart Health Logging", desc: "Log your symptoms and journals. AI learns from your data to support you.", icon: "smart-health-logging" },
                { step: "03", title: "Access AI & Experts", desc: "Get 24/7 AI chat, smart recommendations, and direct links to gynecologists.", icon: "chat" }
              ].map((item, idx) => (
                <div key={idx} className="bg-white px-8 pb-10 pt-12 rounded-[2.5rem] border border-neutral-100 shadow-xl shadow-pink-900/5 text-center relative overflow-hidden group hover:-translate-y-2 active:scale-95 transition-all duration-500 tap-highlight-none">
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-8xl font-black text-pink-500 tracking-tighter">{item.step}</span>
                  </div>
                  <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-pink-500 to-rose-600 mx-auto flex items-center justify-center mb-8 shadow-2xl transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500">
                    <Icon name={item.icon} size={36} className="brightness-0 invert" />
                  </div>
                  <h4 className="text-2xl font-black text-neutral-900 mb-4 tracking-tight group-hover:text-pink-600 transition-colors">{item.title}</h4>
                  <p className="text-neutral-600 text-base leading-relaxed opacity-80">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview - Detailed Features */}
      <section className="py-24 bg-gradient-to-b from-white to-pink-50/30 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 relative">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-pink-200 rounded-full blur-[80px] opacity-30"></div>
              <div className="relative z-10 rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl">
                <div className="bg-neutral-900 p-2 sm:p-4 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                  </div>
                  <div className="mx-auto bg-white/10 rounded-md px-3 py-1 text-[10px] text-white/50 font-mono">momscare.ai/dashboard</div>
                </div>
                <div className="bg-white p-6 sm:p-10 space-y-8">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="h-4 w-32 bg-neutral-100 rounded-full"></div>
                      <div className="h-2 w-20 bg-neutral-50 rounded-full"></div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-pink-100 animate-pulse"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-32 bg-pink-50 rounded-2xl p-4 flex flex-col justify-between">
                      <div className="w-8 h-8 rounded-lg bg-pink-200"></div>
                      <div className="space-y-2">
                        <div className="h-2 w-full bg-pink-300/30 rounded-full"></div>
                        <div className="h-2 w-2/3 bg-pink-300/30 rounded-full"></div>
                      </div>
                    </div>
                    <div className="h-32 bg-blue-50 rounded-2xl p-4 flex flex-col justify-between">
                      <div className="w-8 h-8 rounded-lg bg-blue-200"></div>
                      <div className="space-y-2">
                        <div className="h-2 w-full bg-blue-300/30 rounded-full"></div>
                        <div className="h-2 w-2/3 bg-blue-300/30 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-4 w-40 bg-neutral-100 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-12 w-full bg-neutral-50 rounded-xl"></div>
                      <div className="h-12 w-full bg-neutral-50 rounded-xl"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:w-1/2 space-y-8">
              <div className="inline-block px-4 py-2 bg-pink-100 text-pink-700 rounded-xl font-bold text-sm uppercase tracking-widest">Dashboard Experience</div>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900 leading-tight">Your Health Center, Simplified.</h3>
              <p className="text-lg text-neutral-600 leading-relaxed">
                Everything you need is organized into one beautiful, intuitive dashboard. No more searching through papers or forgetting dates.
              </p>
              
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { title: "One-Click Reports", desc: "Generate professional PDFs for your doctor visits in seconds.", icon: "secure" },
                  { title: "Smart Notifications", desc: "Timely reminders for routines, meds, and health logs.", icon: "notifications" },
                  { title: "Progress Visualization", desc: "Beautiful charts showing your baby's growth and your journey.", icon: "mom" },
                  { title: "Direct Expert Link", desc: "Escalate concerns to healthcare workers directly from your logs.", icon: "doctor" }
                ].map((item, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-1">
                      <span className="text-green-600 text-xs font-bold">✓</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-900">{item.title}</h4>
                      <p className="text-sm text-neutral-500">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Specialized User Sections - Modern Cards */}
      <section id="get-started" className="py-24 bg-gradient-to-br from-neutral-900 to-neutral-800 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-white font-bold tracking-widest uppercase text-sm mb-4">Join Our Community</h2>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black !text-white mb-6">Designed for Mothers, Supported by Professionals</h3>
            <p className="text-lg !text-neutral-300">Choose your path and start experiencing a new standard of pregnancy care today.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4 sm:px-0">
            {/* Mothers Card */}
            <div className="group relative bg-white/5 backdrop-blur-md rounded-[3.5rem] p-10 sm:p-14 border border-white/10 hover:border-pink-500/30 transition-all duration-700 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-pink-600 rounded-full blur-[120px] opacity-10 group-hover:opacity-30 transition-opacity"></div>
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-rose-600 rounded-full blur-[100px] opacity-5"></div>
              
              <div className="relative space-y-10">
                <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-2xl transform group-hover:-rotate-6 transition-transform duration-500">
                  <Icon name="mom" size={48} className="brightness-0 invert" />
                </div>
                <div>
                  <h4 className="text-4xl font-black !text-white mb-6 tracking-tight">For Mothers</h4>
                  <p className="!text-neutral-300 text-xl leading-relaxed opacity-90">
                    Access all AI features, health tracking, and personalized recommendations for free. Start your healthy pregnancy journey now.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-5">
                  {!isMother ? (
                    <>
                      <Link
                        href="/mother/register"
                        className="flex-1 inline-flex items-center justify-center gap-3 font-black px-8 py-5 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-3xl hover:from-pink-700 hover:to-rose-700 transition-all shadow-2xl shadow-pink-900/40 active:scale-95 tap-highlight-none"
                      >
                        Create Account
                        <span className="text-xl">→</span>
                      </Link>
                      <Link
                        href="/mother/login"
                        className="flex-1 inline-flex items-center justify-center font-black px-8 py-5 bg-white/10 text-white rounded-3xl border-2 border-white/20 hover:bg-white/20 transition-all active:scale-95 tap-highlight-none"
                      >
                        Sign In
                      </Link>
                    </>
                  ) : (
                    <button
                      onClick={handleMotherClick}
                      className="w-full inline-flex items-center justify-center gap-3 font-black px-8 py-5 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-3xl hover:from-pink-700 hover:to-rose-700 transition-all shadow-2xl shadow-pink-900/40 active:scale-95 tap-highlight-none"
                    >
                      Go to Dashboard
                      <span className="text-xl">→</span>
                    </button>
                  )}
                </div>
                
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
                  {["Unlimited AI Chat", "Pregnancy Stage Tracking", "Health Journal", "Smart Recommendations"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-neutral-300 font-medium">
                      <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500 font-black text-[10px] border border-pink-500/30">✓</div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Doctors Card */}
            <div className="group relative bg-white/5 backdrop-blur-md rounded-[3.5rem] p-10 sm:p-14 border border-white/10 hover:border-blue-500/30 transition-all duration-700 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600 rounded-full blur-[120px] opacity-10 group-hover:opacity-30 transition-opacity"></div>
              
              <div className="relative space-y-10">
                <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl transform group-hover:rotate-6 transition-transform duration-500">
                  <Icon name="doctor" size={48} className="brightness-0 invert" />
                </div>
                <div>
                  <h4 className="text-4xl font-black !text-white mb-6 tracking-tight">For Doctors</h4>
                  <p className="!text-neutral-300 text-xl leading-relaxed opacity-90">
                    Help mothers in your community, answer questions, and provide expert consultations through our specialized dashboard.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-5">
                  {!isDoctor ? (
                    <>
                      <Link
                        href="/healthworker/register"
                        className="flex-1 inline-flex items-center justify-center gap-3 font-black px-8 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-2xl shadow-blue-900/40 active:scale-95 tap-highlight-none"
                      >
                        Join as Doctor
                        <span className="text-xl">→</span>
                      </Link>
                      <Link
                        href="/healthworker/login"
                        className="flex-1 inline-flex items-center justify-center font-black px-8 py-5 bg-white/10 text-white rounded-3xl border-2 border-white/20 hover:bg-white/20 transition-all active:scale-95 tap-highlight-none"
                      >
                        Doctor Login
                      </Link>
                    </>
                  ) : (
                    <button
                      onClick={handleDoctorClick}
                      className="w-full inline-flex items-center justify-center gap-3 font-black px-8 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-2xl shadow-blue-900/40 active:scale-95 tap-highlight-none"
                    >
                      Go to Dashboard
                      <span className="text-xl">→</span>
                    </button>
                  )}
                </div>
                
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
                  {["Expert Verification", "Question Answering", "Patient Consultation", "Clinical Statistics"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-neutral-300 font-medium">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-black text-[10px] border border-blue-500/30">✓</div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Enhanced Professional Style */}
      <footer className="bg-neutral-950 text-neutral-400 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-20 mb-16">
            <div className="lg:col-span-2 space-y-6">
              <div className="relative w-48 h-12">
                  <Image
                    src="/mainlogo.png"
                    alt="MomsCare Logo"
                    fill
                  className="object-contain"
                  />
              </div>
              <p className="text-lg leading-relaxed max-w-md">
                24/7 AI-powered pregnancy support at your fingertips. Providing personalized guidance, health tracking, and expert access for mothers everywhere.
              </p>
              <div className="flex gap-4">
                {[1, 2, 3, 4].map((_, i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-all cursor-pointer">
                    <span className="text-xs">S{i+1}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-bold text-sm uppercase tracking-[0.2em] mb-8">Platform</h4>
              <ul className="space-y-4">
                <li><Link href="/chat" className="hover:text-pink-500 transition-colors">AI Health Assistant</Link></li>
                <li><Link href="/risk-detection" className="hover:text-pink-500 transition-colors">Risk Detection Tool</Link></li>
                <li><Link href="/mother/dashboard" className="hover:text-pink-500 transition-colors">Mother Dashboard</Link></li>
                <li><Link href="/doctor/login" className="hover:text-pink-500 transition-colors">Healthcare Portal</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold text-sm uppercase tracking-[0.2em] mb-8">Resources</h4>
              <ul className="space-y-4">
                <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection("features"); }} className="hover:text-pink-500 transition-colors">Features</a></li>
                <li><a href="#get-started" onClick={(e) => { e.preventDefault(); scrollToSection("get-started"); }} className="hover:text-pink-500 transition-colors">Get Started</a></li>
                <li><Link href="/privacy" className="hover:text-pink-500 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/offline" className="hover:text-pink-500 transition-colors">Offline Usage</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm">
              © {new Date().getFullYear()} MomsCare. Dedicated to the health and happiness of every mother.
            </p>
            <div className="flex gap-8 text-xs font-bold uppercase tracking-widest">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <span className="text-neutral-700">|</span>
              <span className="text-neutral-500 italic">Made with ❤️ for the world</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Tailwind Animations & Custom Styles */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes blob {
          0%, 100% { transform: scale(1); }
          33% { transform: scale(1.1) translate(10px, -10px); }
          66% { transform: scale(0.9) translate(-10px, 10px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-slow { animation: float 8s ease-in-out infinite; }
        .animate-float-delayed { animation: float 7s ease-in-out 1s infinite; }
        .animate-blob { animation: blob 10s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </main>
    </Layout>
  );
}
