"use client";

import DashboardCard from "@/components/DashboardCard";
import Layout from "@/components/Layout";
import ListCard from "@/components/ListCard";
import DetailModal from "@/components/DetailModal";
import Icon from "@/components/Icon";
import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

type ProfileChange = {
  field: string;
  oldValue: string | undefined;
  newValue: string | undefined;
};

type Doctor = {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  specialty?: string;
  bmdcNumber?: string;
  clinicName?: string;
  clinicAddress?: string;
  qualification?: string;
  experience?: string;
  profilePicture?: string;
  status: "pending" | "approved" | "rejected" | "paused";
  verificationComment?: string;
  previousValues?: Partial<Doctor>;
  changes?: ProfileChange[];
  createdAt: string;
};

type Mother = {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  age?: number;
  address?: string;
  bloodGroup?: string;
  weeksPregnant?: number;
  daysPregnant?: number;
  conditions?: string;
  medications?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  previousPregnancies?: number;
  allergies?: string;
  status?: "active" | "paused";
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
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "doctors" | "mothers" | "reports">("overview");
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedMother, setSelectedMother] = useState<Mother | null>(null);
  const [actionModal, setActionModal] = useState<{
    doctorId: string;
    action: "approve" | "reject" | "delete";
    comment: string;
  } | null>(null);
  const [motherActionModal, setMotherActionModal] = useState<{
    motherId: string;
    action: "delete" | "pause";
  } | null>(null);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [motherSearch, setMotherSearch] = useState("");
  const [analyticsFilter, setAnalyticsFilter] = useState<{
    riskLevel?: "low" | "medium" | "high";
    trimester?: "first" | "second" | "third";
    condition?: string;
    ageMin?: number;
    ageMax?: number;
    daysPregnantMin?: number;
    daysPregnantMax?: number;
  }>({});
  const [appliedFilter, setAppliedFilter] = useState<typeof analyticsFilter>({});
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [selectedReportStatus, setSelectedReportStatus] = useState<"all" | "pending" | "solved" | "rejected">("all");
  const [adminDecisionText, setAdminDecisionText] = useState("");

  const loadDoctorDetails = async (doctorId: string) => {
    const res = await fetch(`/api/admin/doctor-details?id=${doctorId}`, {
      headers: headers(),
    });
    if (res.ok) {
      const data = await res.json();
      setSelectedDoctor(data.doctor);
    }
  };

  const loadMotherDetails = async (motherId: string) => {
    const res = await fetch(`/api/admin/mother-details?id=${motherId}`, {
      headers: headers(),
    });
    if (res.ok) {
      const data = await res.json();
      setSelectedMother(data.profile);
    }
  };

  useEffect(() => {
    const t = localStorage.getItem("adminToken") || "";
    setToken(t);
    if (t) {
      // Restore active tab from localStorage
      const savedTab = localStorage.getItem("adminDashboardTab");
      if (savedTab && ["overview", "analytics", "doctors", "mothers", "reports"].includes(savedTab)) {
        setActiveTab(savedTab as any);
      }
      
      loadPending(t);
      loadOverview(t);
      loadAllDoctors(t);
      loadAllMothers(t);
      loadAnalytics(t);
      loadReports(t);
    }
  }, []);
  
  // Save active tab to localStorage when it changes
  useEffect(() => {
    if (token) {
      localStorage.setItem("adminDashboardTab", activeTab);
    }
  }, [activeTab, token]);
  
  // Redirect to dashboard if logged in and on home page
  useEffect(() => {
    if (token && window.location.pathname === "/") {
      window.location.href = "/admin/dashboard";
    }
  }, [token]);

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

  const loadAnalytics = async (t = token) => {
    const res = await fetch("/api/admin/analytics", { headers: headers(t) });
    if (res.ok) {
      const data = await res.json();
      setAnalytics(data.analytics);
    }
  };

  const loadAllMothers = async (t = token) => {
    const res = await fetch("/api/admin/mothers", { headers: headers(t) });
    if (res.ok) {
      const data = await res.json();
      setAllMothers(data.mothers || []);
    }
  };

  const loadReports = async (t = token) => {
    const res = await fetch("/api/admin/reports", { headers: headers(t) });
    if (res.ok) {
      const data = await res.json();
      setReports(data.reports || []);
    }
  };

  const updateReportStatus = async (reportId: string, status: "pending" | "solved" | "rejected", decision?: string) => {
    try {
      const res = await fetch("/api/admin/reports/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers(),
        },
        body: JSON.stringify({
          reportId,
          status,
          decision,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ Report marked as ${status}`);
        loadReports();
        // Refresh selected report
        const updatedReport = reports.find((r: any) => r.id === reportId);
        if (updatedReport) {
          setSelectedReport({ ...updatedReport, reportStatus: status, adminDecision: decision, adminDecisionAt: new Date().toISOString() });
        }
      } else {
        setMessage(`❌ ${data.error || "Failed to update report"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    }
  };

  const loadOverview = async (t = token) => {
    const res = await fetch("/api/admin/overview", { headers: headers(t) });
    if (res.ok) {
      const data = await res.json();
      setOverview(data.overview);
    }
  };

  const pauseUser = async (userId: string, userType: "doctor" | "mother", pause: boolean) => {
    try {
      const res = await fetch("/api/admin/pause-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers(),
        },
        body: JSON.stringify({ userId, userType, pause }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ User ${pause ? "paused" : "unpaused"} successfully`);
        if (userType === "doctor") {
          loadAllDoctors();
        } else {
          loadAllMothers();
        }
      } else {
        setMessage(`❌ ${data.error || "Failed to update user"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    }
  };

  const deleteUser = async (userId: string, userType: "doctor" | "mother") => {
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers(),
        },
        body: JSON.stringify({ userId, userType }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ User deleted successfully`);
        if (userType === "doctor") {
          loadAllDoctors();
          setSelectedDoctor(null);
        } else {
          loadAllMothers();
          setSelectedMother(null);
        }
      } else {
        setMessage(`❌ ${data.error || "Failed to delete user"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    }
  };

  const openActionModal = (doctorId: string, action: "approve" | "reject" | "delete") => {
    setActionModal({ doctorId, action, comment: "" });
  };

  const handleDeleteUser = async () => {
    if (actionModal) {
      await deleteUser(actionModal.doctorId, "doctor");
      setActionModal(null);
    } else if (motherActionModal) {
      await deleteUser(motherActionModal.motherId, "mother");
      setMotherActionModal(null);
    }
  };

  const closeActionModal = () => {
    setActionModal(null);
  };

  const updateDoctor = async () => {
    if (!actionModal) return;
    
    setMessage("");
    
    // Handle delete separately
    if (actionModal.action === "delete") {
      const res = await fetch(`/api/admin/delete-doctor?id=${actionModal.doctorId}`, {
        method: "DELETE",
        headers: headers(),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Doctor deleted successfully");
        closeActionModal();
        loadPending();
        loadAllDoctors();
        loadOverview();
      } else {
        setMessage(`❌ ${data.error || "Failed to delete doctor"}`);
      }
      return;
    }
    
    // Handle approve/reject
    const res = await fetch("/api/admin/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers() },
      body: JSON.stringify({
        doctorId: actionModal.doctorId,
        action: actionModal.action,
        comment: actionModal.comment.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`✅ Doctor ${actionModal.action === "approve" ? "approved" : "rejected"} successfully`);
      closeActionModal();
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
      <div className="space-y-8">
        {/* Header - Redesigned */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-3">
              Admin Dashboard
            </h1>
            <p className="text-lg text-neutral-600">
              Full access to manage MomsCare platform
            </p>
          </div>
          <button
            className="btn-ghost"
            onClick={() => {
              localStorage.removeItem("adminToken");
              location.href = "/";
            }}
          >
            Logout
          </button>
        </div>

        {/* Message Alert - Redesigned */}
        {message && (
          <div className={`rounded-xl p-4 mb-6 border-2 shadow-md flex items-start gap-3 ${
            message.includes("successfully") || message.includes("Success") 
              ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-200" 
              : "bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border-red-200"
          }`}>
            <Icon 
              name={message.includes("successfully") || message.includes("Success") ? "success" : "error"} 
              size={24} 
              className="flex-shrink-0 mt-0.5"
            />
            <p className="flex-1 font-medium">{message}</p>
            <button
              onClick={() => setMessage("")}
              className="flex-shrink-0 text-neutral-400 hover:text-neutral-600"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        )}

        {/* Tabs - Redesigned */}
        <div className="flex gap-2 border-b-2 border-neutral-200 mb-8 overflow-x-auto pb-2">
          {[
            { id: "overview", label: "Overview", icon: "overview" },
            { id: "analytics", label: "Analytics", icon: "progress" },
            { id: "doctors", label: "Doctors", icon: "doctor" },
            { id: "mothers", label: "Mothers", icon: "mom" },
            { id: "reports", label: `Reports${reports.length > 0 ? ` (${reports.length})` : ""}`, icon: "reports" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`tab flex items-center gap-2 px-6 py-3.5 ${
                activeTab === tab.id ? "tab-active" : "tab-inactive"
              }`}
            >
              {tab.icon && <Icon name={tab.icon} size={20} />}
              <span>{tab.label}</span>
              {tab.id === "reports" && reports.length > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                  {reports.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {overview && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                <DashboardCard title={
                  <span className="flex items-center gap-2">
                    <Icon name="mom" size={20} />
                    Total Mothers
                  </span>
                }>
                  <div className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                    {overview.mothers}
                  </div>
                </DashboardCard>
                <DashboardCard title={
                  <span className="flex items-center gap-2">
                    <Icon name="doctor" size={20} />
                    Approved Doctors
                  </span>
                }>
                  <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {overview.doctors}
                  </div>
                </DashboardCard>
                <DashboardCard title={
                  <span className="flex items-center gap-2">
                    <Icon name="pending" size={20} />
                    Pending Doctors
                  </span>
                }>
                  <div className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                    {overview.pendingDoctors}
                  </div>
                </DashboardCard>
                <DashboardCard title={
                  <span className="flex items-center gap-2">
                    <Icon name="question" size={20} />
                    Total Questions
                  </span>
                }>
                  <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    {overview.questions}
                  </div>
                </DashboardCard>
                <DashboardCard title={
                  <span className="flex items-center gap-2">
                    <Icon name="success" size={20} />
                    Answered
                  </span>
                }>
                  <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {overview.answered}
                  </div>
                  <p className="text-sm text-neutral-500 mt-2">
                    {overview.questions > 0 
                      ? Math.round((overview.answered / overview.questions) * 100) 
                      : 0}% response rate
                  </p>
                </DashboardCard>
              </div>
            )}

            <DashboardCard title={
              <span className="flex items-center gap-2">
                <Icon name="pending" size={20} />
                Pending Doctor Approvals
              </span>
            }>
              <div className="space-y-3">
                {pending.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No pending applications.</p>
                ) : (
                  pending.map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-col gap-3 rounded-xl border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50 p-5 shadow-md hover:shadow-lg transition-all md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {d.profilePicture ? (
                          <img
                            src={d.profilePicture}
                            alt={d.name || "Doctor"}
                            className="w-16 h-16 rounded-full object-cover border-2 border-yellow-300"
                            onError={(e) => {
                              // Hide image on error, show placeholder
                              e.currentTarget.style.display = "none";
                              const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                              if (placeholder) placeholder.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl border-2 border-yellow-300 ${d.profilePicture ? "hidden" : ""}`}
                        >
                          {d.name ? d.name.charAt(0).toUpperCase() : "D"}
                        </div>
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
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          className="btn-secondary text-sm"
                          onClick={() => loadDoctorDetails(d.id)}
                        >
                          <span className="flex items-center gap-1">
                            <Icon name="view" size={16} />
                            Show Details
                          </span>
                        </button>
                        <button
                          className="btn-primary text-sm"
                          onClick={() => openActionModal(d.id, "approve")}
                        >
                          <span className="flex items-center gap-1">
                            <Icon name="approve" size={16} />
                            Approve
                          </span>
                        </button>
                        <button
                          className="btn-secondary text-sm"
                          onClick={() => openActionModal(d.id, "reject")}
                        >
                          <span className="flex items-center gap-1">
                            <Icon name="reject" size={16} />
                            Reject
                          </span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DashboardCard>
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <>
            {analytics ? (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <DashboardCard title="Average Risk Score">
                    <div className="text-4xl font-bold text-orange-600">
                      {analytics.averageRiskScore}
                    </div>
                    <p className="text-sm text-slate-500 mt-2">Out of 100</p>
                  </DashboardCard>
                  <DashboardCard title="Active Chat Users">
                    <div className="text-4xl font-bold text-blue-600">
                      {analytics.overview.activeChatUsers}
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      {analytics.overview.totalMothers > 0
                        ? Math.round((analytics.overview.activeChatUsers / analytics.overview.totalMothers) * 100)
                        : 0}% engagement
                    </p>
                  </DashboardCard>
                  <DashboardCard title="Avg Response Time">
                    <div className="text-4xl font-bold text-green-600">
                      {analytics.overview.avgResponseTimeHours}
                    </div>
                    <p className="text-sm text-slate-500 mt-2">Hours</p>
                  </DashboardCard>
                  <DashboardCard title="High-Risk Mothers">
                    <div className="text-4xl font-bold text-red-600">
                      {analytics.riskDistribution.high}
                    </div>
                    <p className="text-sm text-slate-500 mt-2">Require attention</p>
                  </DashboardCard>
                </div>

                {/* Risk Distribution */}
                <div className="grid gap-6 md:grid-cols-2">
                  <DashboardCard title="Risk Distribution">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-green-600 font-medium">Low Risk</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-slate-200 rounded-full h-4">
                            <div
                              className="bg-green-500 h-4 rounded-full"
                              style={{
                                width: `${(analytics.riskDistribution.low / analytics.overview.totalMothers) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="font-bold">{analytics.riskDistribution.low}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-600 font-medium">Medium Risk</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-slate-200 rounded-full h-4">
                            <div
                              className="bg-yellow-500 h-4 rounded-full"
                              style={{
                                width: `${(analytics.riskDistribution.medium / analytics.overview.totalMothers) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="font-bold">{analytics.riskDistribution.medium}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-red-600 font-medium">High Risk</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-slate-200 rounded-full h-4">
                            <div
                              className="bg-red-500 h-4 rounded-full"
                              style={{
                                width: `${(analytics.riskDistribution.high / analytics.overview.totalMothers) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="font-bold">{analytics.riskDistribution.high}</span>
                        </div>
                      </div>
                    </div>
                  </DashboardCard>

                  <DashboardCard title="Trimester Distribution">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>First Trimester</span>
                        <span className="font-bold">{analytics.trimesterDistribution.first}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Second Trimester</span>
                        <span className="font-bold">{analytics.trimesterDistribution.second}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Third Trimester</span>
                        <span className="font-bold">{analytics.trimesterDistribution.third}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Unknown</span>
                        <span className="font-bold">{analytics.trimesterDistribution.unknown}</span>
                      </div>
                    </div>
                  </DashboardCard>
                </div>

                {/* Age Distribution & Conditions */}
                <div className="grid gap-6 md:grid-cols-2">
                  <DashboardCard title="Age Distribution">
                    <div className="space-y-2">
                      {Object.entries(analytics.ageDistribution).map(([age, count]: [string, any]) => (
                        <div key={age} className="flex justify-between">
                          <span>{age}</span>
                          <span className="font-bold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </DashboardCard>

                  <DashboardCard title="Condition Prevalence">
                    {Object.keys(analytics.conditionPrevalence).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(analytics.conditionPrevalence).map(([condition, count]: [string, any]) => (
                          <div key={condition} className="flex justify-between">
                            <span>{condition}</span>
                            <span className="font-bold text-red-600">{count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-4">No conditions reported</p>
                    )}
                  </DashboardCard>
                </div>

                {/* Geographic Distribution */}
                {Object.keys(analytics.geographicDistribution).length > 0 && (
                  <DashboardCard title="Geographic Distribution (Heatmap Data)">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(analytics.geographicDistribution)
                        .sort(([, a]: any, [, b]: any) => b - a)
                        .slice(0, 9)
                        .map(([location, count]: [string, any]) => (
                          <div
                            key={location}
                            className="flex justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                          >
                            <span className="font-medium">{location}</span>
                            <span className="font-bold text-blue-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </DashboardCard>
                )}

                {/* High-Risk Mothers */}
                {analytics.highRiskMothers && analytics.highRiskMothers.length > 0 && (
                  <DashboardCard title={
                    <span className="flex items-center gap-2">
                      <Icon name="reports" size={20} />
                      High-Risk Mothers Needing Attention
                    </span>
                  }>
                    <div className="space-y-3">
                      {analytics.highRiskMothers.map((mother: any) => (
                        <div
                          key={mother.id}
                          className="p-4 rounded-lg border-2 border-red-200 bg-red-50"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-lg">{mother.name}</p>
                              <p className="text-sm text-slate-600">Risk Score: {mother.riskScore}/100</p>
                              <div className="mt-2">
                                <p className="text-xs font-medium text-slate-700">Risk Factors:</p>
                                <ul className="text-xs text-slate-600 list-disc list-inside">
                                  {mother.riskFactors.slice(0, 3).map((factor: string, idx: number) => (
                                    <li key={idx}>{factor}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            <button
                              className="btn-primary text-xs"
                              onClick={() => {
                                loadMotherDetails(mother.id);
                                setActiveTab("mothers");
                              }}
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DashboardCard>
                )}
              </div>
            ) : (
              <DashboardCard title="Analytics">
                <p className="text-slate-500 text-center py-8">Loading analytics...</p>
              </DashboardCard>
            )}
          </>
        )}

        {/* Doctors Tab */}
        {activeTab === "doctors" && (
          <DashboardCard title="All Doctors">
            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="🔍 Search doctors by name, email, specialty..."
                className="input w-full"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              {allDoctors.filter(d => {
                if (!doctorSearch) return true;
                const search = doctorSearch.toLowerCase();
                return (
                  d.name?.toLowerCase().includes(search) ||
                  d.email.toLowerCase().includes(search) ||
                  d.specialty?.toLowerCase().includes(search) ||
                  d.bmdcNumber?.toLowerCase().includes(search)
                );
              }).length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  {doctorSearch ? "No doctors found matching your search." : "No doctors registered yet."}
                </p>
              ) : (
                allDoctors.filter(d => {
                  if (!doctorSearch) return true;
                  const search = doctorSearch.toLowerCase();
                  return (
                    d.name?.toLowerCase().includes(search) ||
                    d.email.toLowerCase().includes(search) ||
                    d.specialty?.toLowerCase().includes(search) ||
                    d.bmdcNumber?.toLowerCase().includes(search)
                  );
                }).map((d) => (
                  <ListCard
                    key={d.id}
                    title={d.name || "Unnamed doctor"}
                    subtitle={d.email}
                    badge={
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        d.status === "approved" 
                          ? "bg-green-100 text-green-700"
                          : d.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {d.status}
                      </span>
                    }
                    onClick={() => loadDoctorDetails(d.id)}
                  >
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {d.status === "pending" && (
                        <>
                          <button
                            className="btn-primary text-xs py-1 px-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              openActionModal(d.id, "approve");
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-secondary text-xs py-1 px-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              openActionModal(d.id, "reject");
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        className="bg-orange-500 hover:bg-orange-600 text-white text-xs py-1 px-3 rounded transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          pauseUser(d.id, "doctor", d.status !== "paused");
                        }}
                      >
                        {d.status === "paused" ? "▶️ Resume" : "⏸️ Pause"}
                      </button>
                      <button
                        className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-3 rounded transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          openActionModal(d.id, "delete");
                        }}
                      >
                        <span className="flex items-center gap-1">
                          <Icon name="delete" size={16} />
                          Delete
                        </span>
                      </button>
                    </div>
                  </ListCard>
                ))
              )}
            </div>
          </DashboardCard>
        )}

        {/* Mothers Tab */}
        {activeTab === "mothers" && (
          <div className="space-y-4">
            <DashboardCard title="All Mothers">
              {/* Search Bar */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="🔍 Search mothers by name, email..."
                  className="input w-full"
                  value={motherSearch}
                  onChange={(e) => setMotherSearch(e.target.value)}
                />
              </div>
              
              {/* Analytics Filters */}
              {analytics && (
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Filter by Analytics:</p>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <select
                      className="input text-sm"
                      value={analyticsFilter.riskLevel || ""}
                      onChange={(e) => setAnalyticsFilter({ ...analyticsFilter, riskLevel: e.target.value as any || undefined })}
                    >
                      <option value="">All Risk Levels</option>
                      <option value="low">Low Risk</option>
                      <option value="medium">Medium Risk</option>
                      <option value="high">High Risk</option>
                    </select>
                    <select
                      className="input text-sm"
                      value={analyticsFilter.trimester || ""}
                      onChange={(e) => setAnalyticsFilter({ ...analyticsFilter, trimester: e.target.value as any || undefined })}
                    >
                      <option value="">All Trimesters</option>
                      <option value="first">First Trimester (0-12 weeks)</option>
                      <option value="second">Second Trimester (13-27 weeks)</option>
                      <option value="third">Third Trimester (28+ weeks)</option>
                    </select>
                    <select
                      className="input text-sm"
                      value={analyticsFilter.condition || ""}
                      onChange={(e) => setAnalyticsFilter({ ...analyticsFilter, condition: e.target.value || undefined })}
                    >
                      <option value="">All Conditions</option>
                      {Object.keys(analytics.conditionPrevalence || {}).map(condition => (
                        <option key={condition} value={condition}>{condition}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="input text-sm"
                        placeholder="Min Age"
                        value={analyticsFilter.ageMin || ""}
                        onChange={(e) => setAnalyticsFilter({ ...analyticsFilter, ageMin: e.target.value ? parseInt(e.target.value) : undefined })}
                      />
                      <input
                        type="number"
                        className="input text-sm"
                        placeholder="Max Age"
                        value={analyticsFilter.ageMax || ""}
                        onChange={(e) => setAnalyticsFilter({ ...analyticsFilter, ageMax: e.target.value ? parseInt(e.target.value) : undefined })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="input text-sm"
                        placeholder="Min Days Pregnant"
                        value={analyticsFilter.daysPregnantMin || ""}
                        onChange={(e) => setAnalyticsFilter({ ...analyticsFilter, daysPregnantMin: e.target.value ? parseInt(e.target.value) : undefined })}
                      />
                      <input
                        type="number"
                        className="input text-sm"
                        placeholder="Max Days Pregnant"
                        value={analyticsFilter.daysPregnantMax || ""}
                        onChange={(e) => setAnalyticsFilter({ ...analyticsFilter, daysPregnantMax: e.target.value ? parseInt(e.target.value) : undefined })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      className="btn-primary text-sm"
                      onClick={() => setAppliedFilter({ ...analyticsFilter })}
                    >
                      <span className="flex items-center gap-2">
                        <Icon name="success" size={18} />
                        Apply Filters
                      </span>
                    </button>
                    <button
                      className="btn-secondary text-sm"
                      onClick={() => {
                        setAnalyticsFilter({});
                        setAppliedFilter({});
                      }}
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {(() => {
                  let filtered = allMothers.filter(m => {
                    // Search filter
                    if (motherSearch) {
                      const search = motherSearch.toLowerCase();
                      if (!m.name?.toLowerCase().includes(search) && !m.email.toLowerCase().includes(search)) {
                        return false;
                      }
                    }
                    
                    // Apply filters using appliedFilter (not analyticsFilter)
                    if (appliedFilter.riskLevel) {
                      // Calculate risk for this mother
                      const { assessRisk } = require("@/lib/riskPrediction");
                      const assessment = assessRisk(m);
                      if (assessment.overallRisk !== appliedFilter.riskLevel) {
                        return false;
                      }
                    }
                    
                    if (appliedFilter.trimester) {
                      const days = m.daysPregnant || (m.weeksPregnant ? m.weeksPregnant * 7 : undefined);
                      if (days) {
                        const weeks = Math.floor(days / 7);
                        let trimester: "first" | "second" | "third" | undefined;
                        if (weeks < 12) trimester = "first";
                        else if (weeks < 28) trimester = "second";
                        else trimester = "third";
                        if (trimester !== appliedFilter.trimester) {
                          return false;
                        }
                      } else {
                        return false; // No pregnancy data
                      }
                    }
                    
                    if (appliedFilter.condition && m.conditions) {
                      const conditions = m.conditions.toLowerCase();
                      if (!conditions.includes(appliedFilter.condition.toLowerCase())) {
                        return false;
                      }
                    } else if (appliedFilter.condition && !m.conditions) {
                      return false; // Condition filter set but mother has no conditions
                    }
                    
                    if (appliedFilter.ageMin !== undefined && (!m.age || m.age < appliedFilter.ageMin)) {
                      return false;
                    }
                    
                    if (appliedFilter.ageMax !== undefined && (!m.age || m.age > appliedFilter.ageMax)) {
                      return false;
                    }
                    
                    if (appliedFilter.daysPregnantMin !== undefined) {
                      const days = m.daysPregnant || (m.weeksPregnant ? m.weeksPregnant * 7 : undefined);
                      if (!days || days < appliedFilter.daysPregnantMin) {
                        return false;
                      }
                    }
                    
                    if (appliedFilter.daysPregnantMax !== undefined) {
                      const days = m.daysPregnant || (m.weeksPregnant ? m.weeksPregnant * 7 : undefined);
                      if (!days || days > appliedFilter.daysPregnantMax) {
                        return false;
                      }
                    }
                    
                    return true;
                  });
                  
                  return filtered.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">
                      {motherSearch || Object.keys(analyticsFilter).length > 0 
                        ? "No mothers found matching your filters." 
                        : "No mothers registered yet."}
                    </p>
                  ) : (
                    filtered.map((m) => (
                      <ListCard
                        key={m.id}
                        title={m.name || "Unnamed mother"}
                        subtitle={m.email}
                        badge={
                          m.status === "paused" ? (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">Paused</span>
                          ) : undefined
                        }
                        onClick={() => loadMotherDetails(m.id)}
                      >
                        {(() => {
                          const days = m.daysPregnant || (m.weeksPregnant ? m.weeksPregnant * 7 : undefined);
                          if (days) {
                            const weeks = Math.floor(days / 7);
                            return (
                              <p className="text-xs text-slate-500 mt-1">
                                {days} days ({weeks} weeks) pregnant
                              </p>
                            );
                          }
                          return null;
                        })()}
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <button
                            className="bg-orange-500 hover:bg-orange-600 text-white text-xs py-1 px-3 rounded transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              pauseUser(m.id, "mother", m.status !== "paused");
                            }}
                          >
                            {m.status === "paused" ? "▶️ Resume" : "⏸️ Pause"}
                          </button>
                          <button
                            className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-3 rounded transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMotherActionModal({ motherId: m.id, action: "delete" });
                            }}
                          >
                            <span className="flex items-center gap-1">
                          <Icon name="delete" size={16} />
                          Delete
                        </span>
                          </button>
                        </div>
                      </ListCard>
                    ))
                  );
                })()}
              </div>
            </DashboardCard>
          </div>
        )}

        {/* Doctor Details Modal */}
        <DetailModal
          isOpen={!!selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          title={`Doctor Details: ${selectedDoctor?.name || "N/A"}`}
        >
          {selectedDoctor && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {selectedDoctor.profilePicture ? (
                  <img
                    src={selectedDoctor.profilePicture}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-200"
                    onError={(e) => {
                      // Hide image on error, show placeholder
                      e.currentTarget.style.display = "none";
                      const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className={`w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-4xl border-4 border-blue-200 ${selectedDoctor.profilePicture ? "hidden" : ""}`}
                >
                  {selectedDoctor.name ? selectedDoctor.name.charAt(0).toUpperCase() : "D"}
                </div>
              </div>
              {/* Changes Section - Show if doctor has pending changes */}
              {selectedDoctor.changes && selectedDoctor.changes.length > 0 && (
                <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 mb-4">
                  <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                    <span className="flex items-center gap-2">
                      <Icon name="daily-entry" size={18} />
                      Profile Changes Pending Review
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {selectedDoctor.changes.map((change, idx) => {
                      const fieldLabels: Record<string, string> = {
                        email: "Email",
                        name: "Name",
                        phone: "Phone",
                        specialty: "Specialty",
                        bmdcNumber: "BMDC Number",
                        clinicName: "Clinic/Hospital Name",
                        clinicAddress: "Clinic Address",
                        qualification: "Qualifications",
                        experience: "Experience",
                      };
                      const fieldLabel = fieldLabels[change.field] || change.field;
                      return (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-yellow-200">
                          <p className="font-medium text-slate-800 mb-2">{fieldLabel}</p>
                          <div className="grid md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-slate-500 text-xs mb-1">Previous Value:</p>
                              <p className="text-red-700 font-medium line-through">
                                {change.oldValue || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-xs mb-1">New Value:</p>
                              <p className="text-green-700 font-medium">
                                {change.newValue || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-600">Name</p>
                  <p className="text-lg font-semibold">{selectedDoctor.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Email</p>
                  <p className="text-lg font-semibold">{selectedDoctor.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Phone</p>
                  <p className="text-lg font-semibold">{selectedDoctor.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Specialty</p>
                  <p className="text-lg font-semibold">{selectedDoctor.specialty || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">BMDC Number</p>
                  <p className="text-lg font-semibold">{selectedDoctor.bmdcNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Qualifications</p>
                  <p className="text-lg font-semibold">{selectedDoctor.qualification || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Experience</p>
                  <p className="text-lg font-semibold">
                    {selectedDoctor.experience ? `${selectedDoctor.experience} years` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Status</p>
                  <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                    selectedDoctor.status === "approved" 
                      ? "bg-green-100 text-green-700"
                      : selectedDoctor.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {selectedDoctor.status}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-600">Clinic/Hospital Name</p>
                  <p className="text-lg font-semibold">{selectedDoctor.clinicName || "N/A"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-600">Clinic Address</p>
                  <p className="text-lg font-semibold">{selectedDoctor.clinicAddress || "N/A"}</p>
                </div>
                {selectedDoctor.verificationComment && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-slate-600">Admin Comment</p>
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm">{selectedDoctor.verificationComment}</p>
                    </div>
                  </div>
                )}
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-600">Registered</p>
                  <p className="text-sm text-slate-500">
                    {new Date(selectedDoctor.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DetailModal>

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <DashboardCard title={
            <span className="flex items-center gap-2">
              <Icon name="reports" size={20} />
              Reported Questions/Answers
            </span>
          }>
            <div className="mb-4 flex gap-2">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !selectedReportStatus || selectedReportStatus === "all"
                    ? "bg-blue-500 text-white"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
                onClick={() => setSelectedReportStatus("all")}
              >
                All ({reports.length})
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedReportStatus === "pending"
                    ? "bg-yellow-500 text-white"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
                onClick={() => setSelectedReportStatus("pending")}
              >
                Pending ({reports.filter((r: any) => !r.reportStatus || r.reportStatus === "pending").length})
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedReportStatus === "solved"
                    ? "bg-green-500 text-white"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
                onClick={() => setSelectedReportStatus("solved")}
              >
                Solved ({reports.filter((r: any) => r.reportStatus === "solved").length})
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedReportStatus === "rejected"
                    ? "bg-red-500 text-white"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
                onClick={() => setSelectedReportStatus("rejected")}
              >
                Rejected ({reports.filter((r: any) => r.reportStatus === "rejected").length})
              </button>
            </div>
            <div className="space-y-3">
              {reports.filter((r: any) => {
                if (!selectedReportStatus || selectedReportStatus === "all") return true;
                return (r.reportStatus || "pending") === selectedReportStatus;
              }).length === 0 ? (
                <p className="text-slate-500 text-center py-8">No reports found.</p>
              ) : (
                reports.filter((r: any) => {
                  if (!selectedReportStatus || selectedReportStatus === "all") return true;
                  return (r.reportStatus || "pending") === selectedReportStatus;
                }).map((report) => (
                  <div
                    key={report.id}
                    className={`rounded-lg border-2 p-4 ${
                      report.reportStatus === "solved"
                        ? "border-green-200 bg-green-50"
                        : report.reportStatus === "rejected"
                        ? "border-red-200 bg-red-50"
                        : "border-yellow-200 bg-yellow-50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-slate-900">Reported Question</p>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            report.reportStatus === "solved"
                              ? "bg-green-100 text-green-700"
                              : report.reportStatus === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {report.reportStatus || "pending"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 mt-1 line-clamp-2">{report.question}</p>
                      </div>
                      <button
                        className="btn-secondary text-sm ml-2"
                        onClick={() => {
                          setSelectedReport(report);
                          setAdminDecisionText(report.adminDecision || "");
                        }}
                      >
                        <span className="flex items-center gap-1">
                          <Icon name="view" size={16} />
                          View Details
                        </span>
                      </button>
                    </div>
                    <div className="text-xs text-slate-600 mt-2">
                      <p>Reported by: {report.mother?.name || report.mother?.email || "Unknown"}</p>
                      <p>Reported on: {report.reportedAt ? new Date(report.reportedAt).toLocaleString() : "N/A"}</p>
                      <p>Reason: {report.reportReason || "No reason provided"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DashboardCard>
        )}

        {/* Report Details Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-red-600">Report Details</h2>
                  <span className={`inline-block px-3 py-1 rounded text-sm font-medium mt-2 ${
                    selectedReport.reportStatus === "solved"
                      ? "bg-green-100 text-green-700"
                      : selectedReport.reportStatus === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    Status: {selectedReport.reportStatus || "pending"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedReport(null);
                    setAdminDecisionText("");
                  }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="font-semibold text-red-900 mb-2">Report Information</p>
                  <p><strong>Reported by:</strong> {selectedReport.mother?.name || selectedReport.mother?.email || "Unknown"}</p>
                  <p><strong>Reported on:</strong> {selectedReport.reportedAt ? new Date(selectedReport.reportedAt).toLocaleString() : "N/A"}</p>
                  <p><strong>Reason:</strong> {selectedReport.reportReason || "No reason provided"}</p>
                </div>
                <div>
                  <p className="font-semibold mb-2">Question</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{selectedReport.question}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Asked on {new Date(selectedReport.createdAt).toLocaleString()}
                  </p>
                </div>
                {selectedReport.answer && (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                    <p className="font-semibold mb-2">Doctor's Answer</p>
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedReport.answer}</p>
                    {selectedReport.doctor && (
                      <div className="mt-3 pt-3 border-t border-yellow-300">
                        <p className="text-sm"><strong>Answered by:</strong> {selectedReport.doctor.name || selectedReport.doctor.email}</p>
                        <p className="text-sm"><strong>Specialty:</strong> {selectedReport.doctor.specialty || "N/A"}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Answered on {selectedReport.answeredAt ? new Date(selectedReport.answeredAt).toLocaleString() : "N/A"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {selectedReport.comments && selectedReport.comments.length > 0 && (
                  <div>
                    <p className="font-semibold mb-2">Comments & Replies</p>
                    <div className="space-y-3">
                      {selectedReport.comments.map((comment: any) => (
                        <div key={comment.id} className="rounded bg-slate-50 p-3">
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-xs font-medium text-slate-600">
                              <span className="flex items-center gap-1">
                                <Icon name={comment.authorRole === "doctor" ? "doctor" : "mom"} size={16} />
                                {comment.authorRole === "doctor" ? "Doctor" : "Mother"}
                              </span>
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(comment.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-3 ml-4 space-y-2 border-l-2 border-slate-300 pl-3">
                              {comment.replies.map((reply: any) => (
                                <div key={reply.id} className="rounded bg-white p-2">
                                  <div className="flex items-start justify-between mb-1">
                                    <p className="text-xs font-medium text-slate-600">
                                      {reply.authorRole === "doctor" ? "👨‍⚕️ Doctor" : "👩 Mother"} (Reply)
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {new Date(reply.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{reply.content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Decision Section */}
                <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                  <p className="font-semibold text-blue-900 mb-3">Admin Decision & Notification</p>
                  <div className="space-y-3">
                    {selectedReport.adminDecision && (
                      <div className="bg-white rounded-lg p-3 mb-3">
                        <p className="text-sm font-medium text-slate-700 mb-1">Current Decision:</p>
                        <p className="text-slate-800 whitespace-pre-wrap">{selectedReport.adminDecision}</p>
                        {selectedReport.adminDecisionAt && (
                          <p className="text-xs text-slate-500 mt-1">
                            Decision made on: {new Date(selectedReport.adminDecisionAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                    <textarea
                      className="input w-full h-32"
                      placeholder="Write your decision/response to the mother about this report..."
                      value={adminDecisionText}
                      onChange={(e) => setAdminDecisionText(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        className="btn-primary bg-green-500 hover:bg-green-600 flex-1"
                        onClick={async () => {
                          await updateReportStatus(selectedReport.id, "solved", adminDecisionText);
                          setAdminDecisionText("");
                        }}
                        disabled={!adminDecisionText.trim()}
                      >
                        <span className="flex items-center gap-2">
                          <Icon name="success" size={18} />
                          Mark as Solved
                        </span>
                      </button>
                      <button
                        className="btn-primary bg-red-500 hover:bg-red-600 flex-1"
                        onClick={async () => {
                          await updateReportStatus(selectedReport.id, "rejected", adminDecisionText);
                          setAdminDecisionText("");
                        }}
                        disabled={!adminDecisionText.trim()}
                      >
                        <span className="flex items-center gap-2">
                          <Icon name="reject" size={18} />
                          Mark as Rejected
                        </span>
                      </button>
                      <button
                        className="btn-secondary flex-1"
                        onClick={async () => {
                          await updateReportStatus(selectedReport.id, "pending", adminDecisionText || undefined);
                          setAdminDecisionText("");
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <Icon name="pending" size={18} />
                          Mark as Pending
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mother Details Modal */}
        <DetailModal
          isOpen={!!selectedMother}
          onClose={() => setSelectedMother(null)}
          title={`Mother Details: ${selectedMother?.name || "N/A"}`}
        >
          {selectedMother && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-600">Name</p>
                  <p className="text-lg font-semibold">{selectedMother.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Email</p>
                  <p className="text-lg font-semibold">{selectedMother.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Phone</p>
                  <p className="text-lg font-semibold">{selectedMother.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Age</p>
                  <p className="text-lg font-semibold">{selectedMother.age || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Pregnancy Progress</p>
                  <p className="text-lg font-semibold">
                    {(() => {
                      const days = selectedMother.daysPregnant || (selectedMother.weeksPregnant ? selectedMother.weeksPregnant * 7 : undefined);
                      if (!days) return "N/A";
                      const weeks = Math.floor(days / 7);
                      const months = Math.floor(days / 30);
                      return `${days} days (${weeks} weeks, ${months} months)`;
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Blood Group</p>
                  <p className="text-lg font-semibold">{selectedMother.bloodGroup || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Previous Pregnancies</p>
                  <p className="text-lg font-semibold">
                    {selectedMother.previousPregnancies ?? "N/A"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-600">Address</p>
                  <p className="text-lg font-semibold">{selectedMother.address || "N/A"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-600">Medical Conditions</p>
                  <p className="text-lg font-semibold">{selectedMother.conditions || "None"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-600">Medications</p>
                  <p className="text-lg font-semibold">{selectedMother.medications || "None"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-600">Allergies</p>
                  <p className="text-lg font-semibold">{selectedMother.allergies || "None"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Emergency Contact</p>
                  <p className="text-lg font-semibold">
                    {selectedMother.emergencyContact || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Emergency Phone</p>
                  <p className="text-lg font-semibold">
                    {selectedMother.emergencyPhone || "N/A"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-600">Registered</p>
                  <p className="text-sm text-slate-500">
                    {new Date(selectedMother.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DetailModal>

        {/* Action Modal */}
        {actionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                {actionModal.action === "approve" 
                  ? (
                    <span className="flex items-center gap-2">
                      <Icon name="approve" size={18} />
                      Approve Doctor
                    </span>
                  )
                  : actionModal.action === "reject"
                  ? (
                    <span className="flex items-center gap-2">
                      <Icon name="reject" size={18} />
                      Reject Doctor
                    </span>
                  )
                  : (
                    <span className="flex items-center gap-2">
                      <Icon name="delete" size={18} />
                      Delete Doctor
                    </span>
                  )}
              </h2>
              {actionModal.action === "delete" ? (
                <>
                  <p className="text-red-600 font-semibold mb-4">
                    <span className="flex items-start gap-2">
                      <Icon name="warning" size={20} className="mt-0.5" />
                      <span>Are you sure you want to delete this doctor? This action cannot be undone.</span>
                    </span>
                  </p>
                  <div className="flex gap-3">
                    <button
                      className="btn-primary bg-red-500 hover:bg-red-600"
                      onClick={handleDeleteUser}
                    >
                      Yes, Delete
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setActionModal(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-600 mb-4">
                    {actionModal.action === "approve"
                      ? "Add an optional comment for the doctor:"
                      : "Please provide a reason for rejection (required):"}
                  </p>
                  <textarea
                    className="input w-full h-32 mb-4"
                    placeholder={
                      actionModal.action === "approve"
                        ? "Optional comment..."
                        : "Reason for rejection..."
                    }
                    value={actionModal.comment}
                    onChange={(e) =>
                      setActionModal({ ...actionModal, comment: e.target.value })
                    }
                    required={actionModal.action === "reject"}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={updateDoctor}
                      className="btn-primary flex-1"
                      disabled={
                        actionModal.action === "reject" && !actionModal.comment.trim()
                      }
                    >
                      Confirm {actionModal.action === "approve" ? "Approval" : "Rejection"}
                    </button>
                    <button onClick={closeActionModal} className="btn-secondary">
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
