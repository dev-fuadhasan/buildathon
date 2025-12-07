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
      router.push("/doctor/dashboard");
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
          <h1 className="text-3xl font-bold">Doctor Login</h1>
          <p className="text-slate-600">
            Approved doctors can access incoming questions here.
          </p>
        </div>
        <MessagePopup
          isOpen={popup.isOpen}
          onClose={() => setPopup({ ...popup, isOpen: false })}
          type={popup.type}
          title={popup.title}
          message={popup.message}
        />

        <form onSubmit={onSubmit} className="card space-y-4">
          <input
            className="input"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
        
        {/* Registration Link */}
        <div className="text-center">
          <p className="text-slate-600">
            Don't have an account?{" "}
            <Link href="/doctor/register" className="text-blue-600 hover:text-blue-700 font-medium underline">
              Register as Doctor
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}

