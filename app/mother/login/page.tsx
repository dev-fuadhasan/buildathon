"use client";

import Layout from "@/components/Layout";
import MessagePopup from "@/components/MessagePopup";
import Icon from "@/components/Icon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MotherLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [popup, setPopup] = useState<{ isOpen: boolean; type: "success" | "error" | "warning" | "info"; title: string; message: string }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/mother/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        // Show popup for important messages
        const errorMsg = data.error || "Login failed";
        if (errorMsg.includes("paused") || errorMsg.includes("approval")) {
          setPopup({
            isOpen: true,
            type: "error",
            title: "Account Paused",
            message: errorMsg,
          });
        } else {
          setError(errorMsg);
        }
        return;
      }
      localStorage.setItem("motherToken", data.token);
      // Save that we're on dashboard to maintain state
      localStorage.setItem("motherDashboardTab", "profile");
      router.push("/mother/dashboard");
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/google?role=mother");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to initiate Google login");
        return;
      }
      // Redirect to Google OAuth
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
      setGoogleLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex-1 flex flex-col justify-center py-8 sm:py-16 px-4 animate-in fade-in duration-700 w-full">
        <div className="mx-auto w-full max-w-xl space-y-6 sm:space-y-8">
          <div className="text-center space-y-3 sm:space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-gradient-to-br from-pink-500 to-rose-600 shadow-2xl shadow-pink-200 mb-2 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
            <Icon name="mom" size={48} className="brightness-0 invert" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Welcome back, <span className="text-pink-600">Mama</span>
            </h1>
            <p className="text-slate-500 font-medium max-w-sm mx-auto leading-relaxed text-sm sm:text-base">
              Securely access your care journey and personalized pregnancy guidance.
            </p>
          </div>
        </div>
        
        <MessagePopup
          isOpen={popup.isOpen}
          onClose={() => setPopup({ ...popup, isOpen: false })}
          type={popup.type}
          title={popup.title}
          message={popup.message}
        />

        <div className="relative group">
          {/* Decorative background elements */}
          <div className="absolute -inset-1 bg-gradient-to-r from-pink-100 to-rose-100 rounded-[3rem] blur-xl opacity-50 group-hover:opacity-75 transition duration-1000"></div>
          
          <form onSubmit={onSubmit} className="relative bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-[0_20px_50px_rgba(236,72,153,0.1)] border border-pink-50 space-y-8 overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-pink-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60" />
            
            <div className="space-y-5 relative z-10">
              <div className="group/input">
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 group-focus-within/input:text-pink-500 transition-colors">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-pink-500 transition-colors">
                    <Icon name="profile" size={18} />
                  </div>
                  <input
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-pink-200 focus:ring-4 focus:ring-pink-50 outline-none transition-all duration-300"
                    placeholder="Enter your registered email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="group/input">
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 group-focus-within/input:text-pink-500 transition-colors">
                  Security Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-pink-500 transition-colors">
                    <Icon name="secure" size={18} />
                  </div>
                  <input
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-pink-200 focus:ring-4 focus:ring-pink-50 outline-none transition-all duration-300"
                    placeholder="Enter your secure password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-all active:scale-90"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon name="view" size={20} className={showPassword ? "opacity-100" : "opacity-40"} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end relative z-10">
              <Link
                href="/forgot-password?role=mother"
                className="text-xs font-black uppercase tracking-widest text-pink-600 hover:text-rose-700 transition-colors px-2 py-1"
              >
                Forgot Password?
              </Link>
            </div>

            {error && (
              <div className="flex items-center gap-3 text-sm text-red-600 bg-red-50/50 backdrop-blur-sm p-4 rounded-2xl border border-red-100 animate-in shake-in duration-300">
                <Icon name="error" size={18} />
                <p className="font-bold">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              className="group/btn relative w-full bg-gradient-to-r from-pink-500 via-pink-600 to-rose-600 text-white py-5 rounded-2xl text-base font-black uppercase tracking-widest shadow-xl shadow-pink-200 hover:shadow-2xl hover:shadow-pink-300 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none overflow-hidden" 
              disabled={loading}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
              <span className="relative flex items-center justify-center gap-3">
                {loading ? (
                  <>
                    <Icon name="sync" size={20} className="animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Dashboard</span>
                    <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                  </>
                )}
              </span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative bg-white px-4">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">OR</span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="group/google relative w-full bg-white border-2 border-slate-200 text-slate-700 py-5 rounded-2xl text-base font-black uppercase tracking-widest shadow-sm hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
            >
              <div className="absolute inset-0 bg-slate-50 translate-y-full group-hover/google:translate-y-0 transition-transform duration-300"></div>
              <span className="relative flex items-center justify-center gap-3">
                {googleLoading ? (
                  <>
                    <Icon name="sync" size={20} className="animate-spin text-slate-600" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </span>
            </button>
          </form>
        </div>
        
        {/* Registration Section */}
        <div className="text-center space-y-8 pb-12">
          <div className="flex flex-col items-center gap-4">
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">New to MomsCare?</p>
            <Link 
              href="/mother/register" 
              className="inline-flex items-center justify-center gap-3 px-10 py-4 bg-white text-slate-900 border-2 border-slate-100 rounded-2xl font-black uppercase tracking-widest text-xs shadow-sm hover:border-pink-200 hover:bg-pink-50/50 hover:text-pink-600 transition-all duration-300 active:scale-95 group"
            >
              Start Your Journey
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
          
          {/* Trust Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            <div className="flex items-center gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                <Icon name="secure" size={20} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-left leading-tight">
                Private &<br />Encrypted Data
              </p>
            </div>
            <div className="flex items-center gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                <Icon name="info" size={20} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-left leading-tight">
                AI Guidance,<br />Not Diagnosis
              </p>
            </div>
          </div>

          {/* Demo Account Info - Styled as an info card */}
          <div className="bg-blue-50/30 backdrop-blur-sm border-2 border-blue-100/50 rounded-3xl p-6 max-w-sm mx-auto relative overflow-hidden group hover:border-blue-200 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-400" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                <Icon name="info" size={16} />
              </div>
              <p className="text-xs font-black text-blue-600 uppercase tracking-[0.2em]">Quick Demo Access</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 text-left">
                <p className="text-[10px] font-black uppercase text-slate-400">Email</p>
                <p className="text-xs font-bold text-slate-700">demo@mother.com</p>
              </div>
              <div className="space-y-1 text-left">
                <p className="text-[10px] font-black uppercase text-slate-400">Password</p>
                <p className="text-xs font-bold text-slate-700">mother</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Layout>
  );
}

