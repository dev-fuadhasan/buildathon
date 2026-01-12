"use client";

import Layout from "@/components/Layout";
import MessagePopup from "@/components/MessagePopup";
import Icon from "@/components/Icon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DoctorLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      const res = await fetch("/api/auth/doctor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        // Show popup for important messages
        const errorMsg = data.error || "Login failed";
        if (errorMsg.includes("pending") || errorMsg.includes("approval") || errorMsg.includes("paused") || errorMsg.includes("rejected")) {
          setPopup({
            isOpen: true,
            type: data.status === "pending" ? "warning" : "error",
            title: data.status === "pending" ? "Account Pending Approval" : data.status === "paused" ? "Account Paused" : "Account Not Approved",
            message: errorMsg + (data.verificationComment ? `\n\nReason: ${data.verificationComment}` : ""),
          });
        } else {
          setError(errorMsg);
        }
        return;
      }
      localStorage.setItem("doctorToken", data.token);
      // Only doctors can login - route to doctor dashboard
      if (data.role !== "doctor") {
        setError("Only doctors can access this login. Health workers are not supported.");
        localStorage.removeItem("doctorToken");
        return;
      }
      router.push("/doctor/dashboard");
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-xl space-y-8 py-4 sm:py-8 px-4">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-700 shadow-xl mb-4 transform rotate-6">
            <Icon name="doctor" size={40} className="brightness-0 invert" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">Doctor Login</h1>
          <p className="text-neutral-600 font-medium max-w-xs mx-auto leading-relaxed">Access the clinical portal to manage patient interactions.</p>
        </div>

        <MessagePopup
          isOpen={popup.isOpen}
          onClose={() => setPopup({ ...popup, isOpen: false })}
          type={popup.type}
          title={popup.title}
          message={popup.message}
        />

        <form onSubmit={onSubmit} className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-blue-100 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
          
          <div className="space-y-4 relative z-10">
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2 ml-1">Email Address</label>
              <input
                className="input w-full bg-neutral-50 border-neutral-200 focus:bg-white"
                placeholder="doctor@example.com"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            
            <div className="relative">
              <label className="block text-sm font-bold text-neutral-700 mb-2 ml-1">Password</label>
              <div className="relative">
                <input
                  className="input w-full bg-neutral-50 border-neutral-200 focus:bg-white pr-12"
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-blue-600 transition-colors tap-highlight-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <Icon name="view" size={20} className="brightness-0 opacity-50" />
                  ) : (
                    <Icon name="view" size={20} className="brightness-0 opacity-20" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
              <Icon name="error" size={16} />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end">
            <Link
              href="/forgot-password?role=doctor"
              className="text-sm text-blue-600 hover:text-blue-700 font-bold underline underline-offset-4 decoration-2"
            >
              Forgot Password?
            </Link>
          </div>

          <button 
            type="submit" 
            className="btn-primary w-full py-4 text-lg font-black shadow-blue-200 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 active:scale-95 transition-all tap-highlight-none" 
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Icon name="sync" size={20} className="animate-spin brightness-0 invert" />
                Signing in...
              </span>
            ) : "Login to Portal"}
          </button>
        </form>
        
        {/* Registration Link */}
        <div className="text-center space-y-4 pb-8">
          <p className="text-neutral-500 font-medium">Don't have an account yet?</p>
          <Link 
            href="/doctor/register" 
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-neutral-900 border-2 border-neutral-200 rounded-2xl font-bold shadow-sm hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 active:scale-95 tap-highlight-none group"
          >
            Register as Doctor
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
          
          {/* Demo Account Info */}
          <div className="mt-8 bg-blue-50/50 backdrop-blur-sm border border-blue-100 rounded-2xl p-4 max-w-sm mx-auto">
            <p className="text-xs text-blue-600 font-bold uppercase tracking-widest mb-2">Demo Access</p>
            <div className="text-sm text-blue-800 flex justify-center gap-4">
              <p><span className="font-bold">Email:</span> demo@doctor.com</p>
              <p><span className="font-bold">Pass:</span> 123456</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

