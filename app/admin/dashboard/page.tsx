"use client";

import DashboardCard from "@/components/DashboardCard";
import Layout from "@/components/Layout";
import ListCard from "@/components/ListCard";
import DetailModal from "@/components/DetailModal";
import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

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
  status: "pending" | "approved" | "rejected";
  verificationComment?: string;
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
  dueDate?: string;
  conditions?: string;
  medications?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  previousPregnancies?: number;
  allergies?: string;
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
  const t = useTranslation();
  const [token, setToken] = useState("");
  const [pending, setPending] = useState<Doctor[]>([]);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [allMothers, setAllMothers] = useState<Mother[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "doctors" | "mothers">("overview");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedMother, setSelectedMother] = useState<Mother | null>(null);
  const [actionModal, setActionModal] = useState<{
    doctorId: string;
    action: "approve" | "reject" | "delete";
    comment: string;
  } | null>(null);

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

  const openActionModal = (doctorId: string, action: "approve" | "reject" | "delete") => {
    setActionModal({ doctorId, action, comment: "" });
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
                          onClick={() => openActionModal(d.id, "approve")}
                        >
                          ✅ Approve
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => openActionModal(d.id, "reject")}
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
            <div className="space-y-3">
              {allDoctors.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No doctors registered yet.</p>
              ) : (
                allDoctors.map((d) => (
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
                        className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-3 rounded transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          openActionModal(d.id, "delete");
                        }}
                      >
                        🗑️ Delete
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
          <DashboardCard title="All Mothers">
            <div className="space-y-3">
              {allMothers.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No mothers registered yet.</p>
              ) : (
                allMothers.map((m) => (
                  <ListCard
                    key={m.id}
                    title={m.name || "Unnamed mother"}
                    subtitle={m.email}
                    onClick={() => loadMotherDetails(m.id)}
                  >
                    {m.weeksPregnant && (
                      <p className="text-xs text-slate-500 mt-1">
                        {m.weeksPregnant} weeks pregnant
                      </p>
                    )}
                  </ListCard>
                ))
              )}
            </div>
          </DashboardCard>
        )}

        {/* Doctor Details Modal */}
        <DetailModal
          isOpen={!!selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          title={`Doctor Details: ${selectedDoctor?.name || "N/A"}`}
        >
          {selectedDoctor && (
            <div className="space-y-4">
              {selectedDoctor.profilePicture && (
                <div className="flex justify-center">
                  <img
                    src={selectedDoctor.profilePicture}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-200"
                  />
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

        {/* Mother Details Modal */}
        <DetailModal
          isOpen={!!selectedMother}
          onClose={() => setSelectedMother(null)}
          title={`${t.admin.motherDetails}: ${selectedMother?.name || "N/A"}`}
        >
          {selectedMother && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t.mother.name}</p>
                  <p className="text-lg font-semibold">{selectedMother.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">{t.mother.email}</p>
                  <p className="text-lg font-semibold">{selectedMother.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">{t.mother.phone}</p>
                  <p className="text-lg font-semibold">{selectedMother.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">{t.mother.age}</p>
                  <p className="text-lg font-semibold">{selectedMother.age || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">{t.mother.weeksPregnant}</p>
                  <p className="text-lg font-semibold">{selectedMother.weeksPregnant || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">{t.mother.dueDate}</p>
                  <p className="text-lg font-semibold">
                    {selectedMother.dueDate
                      ? new Date(selectedMother.dueDate).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">{t.mother.bloodGroup}</p>
                  <p className="text-lg font-semibold">{selectedMother.bloodGroup || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">{t.mother.previousPregnancies}</p>
                  <p className="text-lg font-semibold">
                    {selectedMother.previousPregnancies ?? "N/A"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-600">{t.mother.address}</p>
                  <p className="text-lg font-semibold">{selectedMother.address || "N/A"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-600">{t.mother.conditions}</p>
                  <p className="text-lg font-semibold">{selectedMother.conditions || t.admin.none}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-600">{t.mother.medications}</p>
                  <p className="text-lg font-semibold">{selectedMother.medications || t.admin.none}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-600">{t.mother.allergies}</p>
                  <p className="text-lg font-semibold">{selectedMother.allergies || t.admin.none}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">{t.mother.emergencyContact}</p>
                  <p className="text-lg font-semibold">
                    {selectedMother.emergencyContact || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">{t.mother.emergencyPhone}</p>
                  <p className="text-lg font-semibold">
                    {selectedMother.emergencyPhone || "N/A"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-600">{t.admin.registered}</p>
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
                  ? "✅ Approve Doctor" 
                  : actionModal.action === "reject"
                  ? "❌ Reject Doctor"
                  : "🗑️ Delete Doctor"}
              </h2>
              {actionModal.action === "delete" ? (
                <>
                  <p className="text-slate-600 mb-4">
                    Are you sure you want to delete this doctor? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={updateDoctor}
                      className="bg-red-500 hover:bg-red-600 text-white flex-1 py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      Delete Doctor
                    </button>
                    <button onClick={closeActionModal} className="btn-secondary">
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
