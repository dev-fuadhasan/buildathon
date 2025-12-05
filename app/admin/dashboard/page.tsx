"use client";

import DashboardCard from "@/components/DashboardCard";
import Layout from "@/components/Layout";
import { useEffect, useState } from "react";

type Doctor = { id: string; name?: string; email: string; specialty?: string };
type Overview = {
  mothers: number;
  doctors: number;
  pendingDoctors: number;
  questions: number;
  answered: number;
};

export default function AdminDashboard() {
  const [token, setToken] = useState("");
  const [pending, setPending] = useState<Doctor[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("adminToken") || "";
    setToken(t);
    if (t) {
      loadPending(t);
      loadOverview(t);
    }
  }, []);

  const headers = (t = token) => (t ? { Authorization: `Bearer ${t}` } : undefined);

  const loadPending = async (t = token) => {
    const res = await fetch("/api/admin/doctors", { headers: headers(t) });
    if (res.ok) {
      const data = await res.json();
      setPending(data.pending || []);
    }
  };

  const loadOverview = async (t = token) => {
    const res = await fetch("/api/admin/overview", { headers: headers(t) });
    if (res.ok) {
      const data = await res.json();
      setOverview(data.overview);
    }
  };

  const updateDoctor = async (doctorId: string, action: "approve" | "reject") => {
    const res = await fetch("/api/admin/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers() },
      body: JSON.stringify({ doctorId, action }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Updated doctor status");
      loadPending();
      loadOverview();
    } else {
      setMessage(data.error || "Failed to update doctor");
    }
  };

  if (!token) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-slate-600">Please log in to continue.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin overview</h1>
            <p className="text-slate-600">Approve doctors and monitor usage.</p>
          </div>
          <button
            className="text-sm text-pink-600 underline"
            onClick={() => {
              localStorage.removeItem("adminToken");
              location.reload();
            }}
          >
            Logout
          </button>
        </div>
        {message && <p className="text-sm text-slate-600">{message}</p>}

        {overview && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card">
              <p className="text-sm text-slate-500">Mothers</p>
              <p className="text-3xl font-bold">{overview.mothers}</p>
            </div>
            <div className="card">
              <p className="text-sm text-slate-500">Doctors (approved)</p>
              <p className="text-3xl font-bold">{overview.doctors}</p>
              <p className="text-xs text-slate-500">{overview.pendingDoctors} pending</p>
            </div>
            <div className="card">
              <p className="text-sm text-slate-500">Questions</p>
              <p className="text-3xl font-bold">{overview.questions}</p>
              <p className="text-xs text-slate-500">{overview.answered} answered</p>
            </div>
          </div>
        )}

        <DashboardCard title="Pending doctors">
          <div className="space-y-3">
            {pending.length === 0 && (
              <p className="text-sm text-slate-500">No pending applications.</p>
            )}
            {pending.map((d) => (
              <div
                key={d.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-white p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold">{d.name || "Unnamed doctor"}</p>
                  <p className="text-sm text-slate-600">{d.email}</p>
                  <p className="text-xs text-slate-500">{d.specialty}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-primary"
                    onClick={() => updateDoctor(d.id, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => updateDoctor(d.id, "reject")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </Layout>
  );
}

