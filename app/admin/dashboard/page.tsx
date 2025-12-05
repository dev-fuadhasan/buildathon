"use client";

import DashboardCard from "@/components/DashboardCard";
import Layout from "@/components/Layout";
import { useEffect, useState } from "react";

type Doctor = {
  id: string;
  name?: string;
  email: string;
  specialty?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

type Mother = {
  id: string;
  name?: string;
  email: string;
  age?: number;
  weeksPregnant?: number;
  phone?: string;
  createdAt: string;
};

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
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [allMothers, setAllMothers] = useState<Mother[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "doctors" | "mothers">("overview");
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [expandedMother, setExpandedMother] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("adminToken") || "";
    setToken(t);
    if (t) {
      loadPending(t);
      loadOverview(t);
      loadAllDoctors(t);
      loadAllMothers(t);
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

  const loadAllDoctors = async (t = token) => {
    const res = await fetch("/api/admin/doctors-list", { headers: headers(t) });
    if (res.ok) {
      const data = await res.json();
      setAllDoctors(data.doctors || []);
    }
  };

  const loadAllMothers = async (t = token) => {
    const res = await fetch("/api/admin/mothers", { headers: headers(t) });
    if (res.ok) {
      const data = await res.json();
      setAllMothers(data.mothers || []);
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
    setMessage("");
    const res = await fetch("/api/admin/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers() },
      body: JSON.stringify({ doctorId, action }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`✅ Doctor ${action === "approve" ? "approved" : "rejected"} successfully`);
      loadPending();
      loadAllDoctors();
      loadOverview();
    } else {
      setMessage(`❌ ${data.error || "Failed to update doctor"}`);
    }
  };

  if (!token) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
          <p className="text-slate-600 mb-6">Please log in to continue.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-purple-600">Admin Dashboard</h1>
            <p className="text-slate-600 mt-2">Full access to manage MomsCare platform</p>
          </div>
          <button
            className="btn-secondary"
            onClick={() => {
              localStorage.removeItem("adminToken");
              location.href = "/";
            }}
          >
            Logout
          </button>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`rounded-lg p-4 ${
            message.includes("✅") 
              ? "bg-green-50 text-green-800 border border-green-200" 
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          {[
            { id: "overview", label: "📊 Overview" },
            { id: "doctors", label: "👨‍⚕️ Doctors" },
            { id: "mothers", label: "👩 Mothers" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-purple-600 text-purple-600"
                  : "text-slate-600 hover:text-purple-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {overview && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                <DashboardCard title="Total Mothers">
                  <div className="text-4xl font-bold text-pink-600">{overview.mothers}</div>
                </DashboardCard>
                <DashboardCard title="Approved Doctors">
                  <div className="text-4xl font-bold text-green-600">{overview.doctors}</div>
                </DashboardCard>
                <DashboardCard title="Pending Doctors">
                  <div className="text-4xl font-bold text-yellow-600">{overview.pendingDoctors}</div>
                </DashboardCard>
                <DashboardCard title="Total Questions">
                  <div className="text-4xl font-bold text-blue-600">{overview.questions}</div>
                </DashboardCard>
                <DashboardCard title="Answered">
                  <div className="text-4xl font-bold text-purple-600">{overview.answered}</div>
                  <p className="text-sm text-slate-500 mt-2">
                    {overview.questions > 0 
                      ? Math.round((overview.answered / overview.questions) * 100) 
                      : 0}% response rate
                  </p>
                </DashboardCard>
              </div>
            )}

            <DashboardCard title="⏳ Pending Doctor Approvals">
              <div className="space-y-3">
                {pending.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No pending applications.</p>
                ) : (
                  pending.map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-col gap-3 rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{d.name || "Unnamed doctor"}</p>
                        <p className="text-sm text-slate-600">{d.email}</p>
                        {d.specialty && (
                          <p className="text-xs text-slate-500 mt-1">Specialty: {d.specialty}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          Applied: {new Date(d.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="btn-primary"
                          onClick={() => updateDoctor(d.id, "approve")}
                        >
                          ✅ Approve
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => updateDoctor(d.id, "reject")}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DashboardCard>
          </>
        )}

        {/* Doctors Tab */}
        {activeTab === "doctors" && (
          <DashboardCard title="All Doctors">
            <div className="space-y-4">
              {allDoctors.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No doctors registered yet.</p>
              ) : (
                allDoctors.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-lg border-2 border-slate-200 bg-white p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-lg">{d.name || "Unnamed doctor"}</p>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            d.status === "approved" 
                              ? "bg-green-100 text-green-700"
                              : d.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {d.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{d.email}</p>
                        {d.specialty && (
                          <p className="text-sm text-slate-500 mt-1">Specialty: {d.specialty}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                          Registered: {new Date(d.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {d.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            className="btn-primary text-sm"
                            onClick={() => updateDoctor(d.id, "approve")}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-secondary text-sm"
                            onClick={() => updateDoctor(d.id, "reject")}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DashboardCard>
        )}

        {/* Mothers Tab */}
        {activeTab === "mothers" && (
          <DashboardCard title="All Mothers">
            <div className="space-y-4">
              {allMothers.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No mothers registered yet.</p>
              ) : (
                allMothers.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-lg border-2 border-slate-200 bg-white p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{m.name || "Unnamed mother"}</p>
                        <p className="text-sm text-slate-600">{m.email}</p>
                        {m.phone && (
                          <p className="text-sm text-slate-500 mt-1">Phone: {m.phone}</p>
                        )}
                        {m.age && (
                          <p className="text-sm text-slate-500">Age: {m.age}</p>
                        )}
                        {m.weeksPregnant && (
                          <p className="text-sm text-slate-500">
                            {m.weeksPregnant} weeks pregnant
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                          Registered: {new Date(m.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DashboardCard>
        )}
      </div>
    </Layout>
  );
}
