"use client";

import Layout from "@/components/Layout";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MotherLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      if (!res.ok) throw new Error(data.error || "Login failed");
      localStorage.setItem("motherToken", data.token);
      router.push("/mother/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mother Login</h1>
          <p className="text-slate-600">Access your dashboard and chat context.</p>
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
            <Link href="/mother/register" className="text-pink-600 hover:text-pink-700 font-medium underline">
              Register as Mother
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}

