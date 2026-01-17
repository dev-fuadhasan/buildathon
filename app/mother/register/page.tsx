"use client";

import Layout from "@/components/Layout";
import Icon from "@/components/Icon";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MotherRegister() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/mother/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      localStorage.setItem("motherToken", data.token);
      // Redirect to onboarding for new users
      router.push("/mother/onboarding");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/google?role=mother");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to initiate Google registration");
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
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-pink-500 to-rose-600 shadow-xl shadow-pink-100 mb-2 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
              <Icon name="mom" size={40} className="brightness-0 invert" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Begin Your <span className="text-pink-600">Journey</span>
              </h1>
              <p className="text-slate-500 font-medium max-w-xs mx-auto leading-relaxed text-sm sm:text-base">
                Create your account for personalized guidance and secure clinical support.
              </p>
            </div>
          </div>

          <div className="relative group">
            {/* Decorative background elements */}
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-100 to-rose-100 rounded-[2.5rem] blur-xl opacity-50 group-hover:opacity-75 transition duration-1000"></div>
            
            <form onSubmit={onSubmit} className="relative bg-white rounded-[2rem] p-5 sm:p-10 shadow-[0_20px_50px_rgba(236,72,153,0.08)] border border-pink-50 space-y-4 sm:space-y-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-60" />
              
              <div className="space-y-5 relative z-10">
                <div className="group/input">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 ml-1 group-focus-within/input:text-pink-500 transition-colors">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-pink-500 transition-colors">
                      <Icon name="profile" size={18} />
                    </div>
                    <input
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-pink-200 focus:ring-4 focus:ring-pink-50 outline-none transition-all duration-300"
                      placeholder="Enter your full name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="group/input">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 ml-1 group-focus-within/input:text-pink-500 transition-colors">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-pink-500 transition-colors">
                      <Icon name="profile" size={18} />
                    </div>
                    <input
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-pink-200 focus:ring-4 focus:ring-pink-50 outline-none transition-all duration-300"
                      placeholder="name@example.com"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="group/input">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 ml-1 group-focus-within/input:text-pink-500 transition-colors">
                    Create Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-pink-500 transition-colors">
                      <Icon name="secure" size={18} />
                    </div>
                    <input
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3.5 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-pink-200 focus:ring-4 focus:ring-pink-50 outline-none transition-all duration-300"
                      placeholder="Min. 6 characters"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-all active:scale-90"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <Icon name="view" size={18} className={showPassword ? "opacity-100" : "opacity-40"} />
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-sm text-red-600 bg-red-50/50 backdrop-blur-sm p-4 rounded-xl border border-red-100 animate-in shake-in duration-300">
                  <Icon name="error" size={18} />
                  <p className="font-bold leading-tight">{error}</p>
                </div>
              )}

              <button 
                type="submit" 
                className="group/btn relative w-full bg-gradient-to-r from-pink-500 via-pink-600 to-rose-600 text-white py-4 rounded-xl text-sm font-black uppercase tracking-[0.2em] shadow-lg shadow-pink-200 hover:shadow-xl hover:shadow-pink-300 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none overflow-hidden" 
                disabled={loading}
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                <span className="relative flex items-center justify-center gap-3">
                  {loading ? (
                    <>
                      <Icon name="sync" size={18} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span>Create My Account</span>
                      <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                    </>
                  )}
                </span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center py-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative bg-white px-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">OR</span>
                </div>
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={googleLoading || loading}
                className="group/google relative w-full bg-white border-2 border-slate-200 text-slate-700 py-4 rounded-xl text-sm font-black uppercase tracking-[0.2em] shadow-sm hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
              >
                <div className="absolute inset-0 bg-slate-50 translate-y-full group-hover/google:translate-y-0 transition-transform duration-300"></div>
                <span className="relative flex items-center justify-center gap-3">
                  {googleLoading ? (
                    <>
                      <Icon name="sync" size={18} className="animate-spin text-slate-600" />
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

          <div className="text-center space-y-6 pb-12">
            <div className="flex flex-col items-center gap-4">
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Already registered?</p>
              <Link 
                href="/mother/login" 
                className="inline-flex items-center justify-center gap-3 px-8 py-3 bg-white text-slate-900 border-2 border-slate-100 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-sm hover:border-pink-200 hover:bg-pink-50/50 hover:text-pink-600 transition-all duration-300 active:scale-95 group"
              >
                Sign In to Account
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>

            {/* Trust indicators & Demo */}
            <div className="space-y-4 max-w-sm mx-auto">
              <div className="bg-blue-50/30 backdrop-blur-sm border-2 border-blue-100/50 rounded-[2rem] p-6 relative overflow-hidden group hover:border-blue-200 transition-colors">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-400" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <Icon name="info" size={16} />
                  </div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Quick Demo Access</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 text-left">
                    <p className="text-[9px] font-black uppercase text-slate-400">Email</p>
                    <p className="text-[11px] font-bold text-slate-700">demo@mother.com</p>
                  </div>
                  <div className="space-y-1 text-left">
                    <p className="text-[9px] font-black uppercase text-slate-400">Password</p>
                    <p className="text-[11px] font-bold text-slate-700">mother</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
