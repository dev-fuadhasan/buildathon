"use client";

import Layout from "@/components/Layout";
import MessagePopup from "@/components/MessagePopup";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "mother"; // Default to mother

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPopup({
          isOpen: true,
          type: "error",
          title: "Error",
          message: data.error || "Failed to send reset email. Please try again.",
        });
        return;
      }

      setPopup({
        isOpen: true,
        type: "success",
        title: "Email Sent",
        message: data.message || "If an account exists with this email, a password reset link has been sent. Please check your inbox.",
      });

      // Clear email field
      setEmail("");
    } catch (err: any) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Error",
        message: err.message || "An error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Forgot Password
          </h1>
          <p className="text-slate-600 mt-2">
            Enter your email address and we'll send you a link to reset your password.
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              className="input w-full"
              placeholder="Enter your email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-slate-600">
            Remember your password?{" "}
            <Link
              href={role === "doctor" ? "/doctor/login" : "/mother/login"}
              className="text-pink-600 hover:text-pink-700 font-medium underline"
            >
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}

export default function ForgotPassword() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="mx-auto max-w-xl space-y-6">
          <div className="card">
            <p className="text-center text-slate-600">Loading...</p>
          </div>
        </div>
      </Layout>
    }>
      <ForgotPasswordForm />
    </Suspense>
  );
}

