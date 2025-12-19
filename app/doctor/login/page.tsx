"use client";

import Layout from "@/components/Layout";
import MessagePopup from "@/components/MessagePopup";
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
      // Route based on role: doctor -> /doctor/dashboard, nurse/others -> /nurse/dashboard
      const dashboardRoute = data.dashboardRoute || (data.role === "doctor" ? "/doctor/dashboard" : "/nurse/dashboard");
      router.push(dashboardRoute);
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Health Workers Login</h1>
          <p className="text-slate-600">
            Approved health workers (doctors, nurses, and others) can access their dashboards here.
          </p>
        </div>
        <MessagePopup
          isOpen={popup.isOpen}
          onClose={() => setPopup({ ...popup, isOpen: false })}
          type={popup.type}
          title={popup.title}
          message={popup.message}
        />

        {/* Demo Account Info */}
        <div className="bg-blue-50/60 border border-blue-200/60 rounded-lg p-4 space-y-3">
          <p className="text-sm text-blue-900/80 font-medium">
            You can easily create a new account, but it requires admin approval. If you want to check an account already created, use these credentials.
          </p>
          <div className="text-sm text-blue-800/70 space-y-2">
            <div>
              <p className="font-semibold mb-1">For doctor:</p>
              <p className="ml-2"><span className="font-medium">Email:</span> demo@doctor.com</p>
              <p className="ml-2"><span className="font-medium">Password:</span> 123456</p>
            </div>
            <div>
              <p className="font-semibold mb-1">For nurse:</p>
              <p className="ml-2"><span className="font-medium">Email:</span> demo@nurse1.com</p>
              <p className="ml-2"><span className="font-medium">Password:</span> 123456</p>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4">
          <input
            className="input"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <div className="relative">
            <input
              className="input pr-10"
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              )}
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center justify-between">
            <Link
              href="/forgot-password?role=doctor"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Forgot Password?
            </Link>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
        
        {/* Registration Link */}
        <div className="text-center">
          <p className="text-slate-600">
            Don't have an account?{" "}
            <Link href="/doctor/register" className="text-blue-600 hover:text-blue-700 font-medium underline">
              Register as Health Worker
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}

