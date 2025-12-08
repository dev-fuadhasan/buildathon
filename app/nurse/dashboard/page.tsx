"use client";

import DashboardCard from "@/components/DashboardCard";
import Layout from "@/components/Layout";
import MessagePopup from "@/components/MessagePopup";
import MobileDashboardMenu from "@/components/MobileDashboardMenu";
import PatientCard from "@/components/PatientCard";
import Badge from "@/components/Badge";
import Icon from "@/components/Icon";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PatientData } from "@/lib/data";

type PriorityPatient = {
  patient: PatientData;
  priorityScore: number;
  priorityReason: string;
};

export default function NurseDashboard() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [nurseId, setNurseId] = useState("");
  const [nurseName, setNurseName] = useState("");
  const [hospitalClinicName, setHospitalClinicName] = useState("");
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [priorityList, setPriorityList] = useState<PriorityPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [prioritySearchQuery, setPrioritySearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "priority" | "name">("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [patientsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState<"priority" | "patients">("priority");
  const prioritySectionRef = useRef<HTMLDivElement | null>(null);
  const patientsSectionRef = useRef<HTMLDivElement | null>(null);

  // Determine status for priority badges
  const getStatus = (patient: PatientData) => {
    const hasHighRisk =
      patient.medicalHistory?.toLowerCase().includes("diabetes") ||
      patient.medicalHistory?.toLowerCase().includes("hypertension") ||
      patient.medicalHistory?.toLowerCase().includes("heart") ||
      (patient.allergies && patient.allergies.length > 0);

    if (hasHighRisk) return { label: "High Risk", variant: "error" as const };
    const hasFiles = (patient.prescriptions?.length || 0) + (patient.reports?.length || 0) > 0;
    if (hasFiles) return { label: "Active", variant: "info" as const };
    return { label: "Normal", variant: "success" as const };
  };
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [patientForm, setPatientForm] = useState({
    name: "",
    age: "",
    phone: "",
    email: "",
    address: "",
    bloodGroup: "",
    medicalHistory: "",
    allergies: "",
    currentMedications: "",
    emergencyContact: "",
    emergencyPhone: "",
    notes: "",
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadFileType, setUploadFileType] = useState<"prescription" | "report" | "document">("prescription");
  const [uploadFileDescriptions, setUploadFileDescriptions] = useState({
    prescription: "",
    report: "",
    document: "",
  });
  const [popup, setPopup] = useState<{ isOpen: boolean; type: "success" | "error" | "warning" | "info"; title: string; message: string }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  useEffect(() => {
    const t = localStorage.getItem("doctorToken") || "";
    setToken(t);
    if (t) {
      try {
        const payload = JSON.parse(atob(t.split('.')[1]));
        setNurseId(payload.id || "");
      } catch {
        // Will be set when profile loads
      }
      loadNurseProfile(t);
      loadPatients(t);
      loadPriorityList(t);
      
      // Auto-refresh priority list every 5 minutes
      const priorityInterval = setInterval(() => {
        loadPriorityList(t);
      }, 5 * 60 * 1000);
      
      return () => {
        clearInterval(priorityInterval);
      };
    }
  }, []);

  const headers = (t = token) => ({
    Authorization: `Bearer ${t}`,
  });

  const [nurseProfile, setNurseProfile] = useState<any>(null);
  
  const loadNurseProfile = async (t = token) => {
    try {
      const res = await fetch("/api/doctor/profile", {
        headers: headers(t),
      });
      if (res.ok) {
        const data = await res.json();
        setNurseProfile(data.profile);
        setNurseName(data.profile?.name || "");
        setHospitalClinicName(data.profile?.hospitalClinicName || "");
      }
    } catch (err) {
      console.error("Failed to load nurse profile:", err);
    }
  };

  const loadPatients = async (t = token) => {
    try {
      setLoading(true);
      const res = await fetch("/api/nurse/patients", {
        headers: headers(t),
      });
      if (res.ok) {
        const data = await res.json();
        // Sort patients: newest first
        const sortedPatients = (data.patients || []).sort((a: PatientData, b: PatientData) => {
          const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return dateB - dateA; // Descending order (newest first)
        });
        setPatients(sortedPatients);
      }
    } catch (err) {
      console.error("Failed to load patients:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPriorityList = async (t = token) => {
    try {
      const res = await fetch("/api/nurse/priority-list", {
        headers: headers(t),
      });
      if (res.ok) {
        const data = await res.json();
        setPriorityList(data.priorityList || []);
      }
    } catch (err) {
      console.error("Failed to load priority list:", err);
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    if (!confirm("Are you sure you want to delete this patient?")) return;
    
    try {
      const res = await fetch(`/api/nurse/patients/${patientId}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (res.ok) {
        setPopup({
          isOpen: true,
          type: "success",
          title: "Success",
          message: "Patient deleted successfully",
        });
        loadPatients();
        loadPriorityList(); // Refresh priority list
      } else {
        const data = await res.json();
        setPopup({
          isOpen: true,
          type: "error",
          title: "Error",
          message: data.error || "Failed to delete patient",
        });
      }
    } catch (err) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "Failed to delete patient",
      });
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/nurse/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({
          ...patientForm,
          age: patientForm.age ? parseInt(patientForm.age) : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const newPatientId = data.patient?.id;
        setPopup({
          isOpen: true,
          type: "success",
          title: "Success",
          message: "Patient added successfully",
        });
        setShowAddModal(false);
        // Reset form completely
        setPatientForm({
          name: "",
          age: "",
          phone: "",
          email: "",
          address: "",
          bloodGroup: "",
          medicalHistory: "",
          allergies: "",
          currentMedications: "",
          emergencyContact: "",
          emergencyPhone: "",
          notes: "",
        });
        setUploadFileDescriptions({
          prescription: "",
          report: "",
          document: "",
        });
        loadPatients();
        // Trigger priority update only after save
        if (hospitalClinicName) {
          try {
            const priorityRes = await fetch("/api/nurse/update-priority", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...headers() },
              body: JSON.stringify({ hospitalClinicName }),
            });
            if (priorityRes.ok) {
              loadPriorityList();
            }
          } catch (err) {
            console.error("Failed to update priority:", err);
          }
        }
      } else {
        setPopup({
          isOpen: true,
          type: "error",
          title: "Error",
          message: data.error || "Failed to add patient",
        });
      }
    } catch (err) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "Failed to add patient",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/nurse/patients/${selectedPatient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({
          ...patientForm,
          age: patientForm.age ? parseInt(patientForm.age) : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPopup({
          isOpen: true,
          type: "success",
          title: "Success",
          message: "Patient updated successfully",
        });
        setShowEditModal(false);
        setSelectedPatient(null);
        loadPatients();
        // Trigger priority update only after save
        try {
          const res = await fetch("/api/nurse/update-priority", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers() },
            body: JSON.stringify({ hospitalClinicName }),
          });
          if (res.ok) {
            loadPriorityList();
          }
        } catch (err) {
          console.error("Failed to update priority:", err);
        }
      } else {
        setPopup({
          isOpen: true,
          type: "error",
          title: "Error",
          message: data.error || "Failed to update patient",
        });
      }
    } catch (err) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "Failed to update patient",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: "prescription" | "report" | "document") => {
    const file = e.target.files?.[0];
    if (!file || !selectedPatient) return;

    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "Please upload PDF, PNG, or JPG files only",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "File size must be less than 10MB",
      });
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", fileType);
      formData.append("description", uploadFileDescriptions[fileType] || "");

      const res = await fetch(`/api/nurse/patients/${selectedPatient.id}/files`, {
        method: "POST",
        headers: headers(),
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setPopup({
          isOpen: true,
          type: "success",
          title: "Success",
          message: "File uploaded successfully",
        });
        setUploadFileDescriptions({ ...uploadFileDescriptions, [fileType]: "" });
        e.target.value = "";
        loadPatients();
        // Don't trigger priority update on file upload - only on save
        // Reload selected patient to get updated file list
        const patientRes = await fetch(`/api/nurse/patients/${selectedPatient.id}`, {
          headers: headers(),
        });
        if (patientRes.ok) {
          const patientData = await patientRes.json();
          setSelectedPatient(patientData.patient);
        }
      } else {
        setPopup({
          isOpen: true,
          type: "error",
          title: "Error",
          message: data.error || "Failed to upload file",
        });
      }
    } catch (err) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "Failed to upload file",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteFile = async (fileId: string, fileType: "prescription" | "report" | "document") => {
    if (!selectedPatient) return;
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const res = await fetch(`/api/nurse/patients/${selectedPatient.id}/files?fileId=${fileId}&fileType=${fileType}`, {
        method: "DELETE",
        headers: headers(),
      });

      if (res.ok) {
        setPopup({
          isOpen: true,
          type: "success",
          title: "Success",
          message: "File deleted successfully",
        });
        loadPatients();
        // Don't trigger priority update on file delete - only on save
        // Reload selected patient
        const patientRes = await fetch(`/api/nurse/patients/${selectedPatient.id}`, {
          headers: headers(),
        });
        if (patientRes.ok) {
          const patientData = await patientRes.json();
          setSelectedPatient(patientData.patient);
        }
      } else {
        const data = await res.json();
        setPopup({
          isOpen: true,
          type: "error",
          title: "Error",
          message: data.error || "Failed to delete file",
        });
      }
    } catch (err) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "Failed to delete file",
      });
    }
  };

  // Filter and sort patients
  const filteredAndSortedPatients = patients
    .filter((p) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(query) ||
        p.phone.includes(query) ||
        (p.email && p.email.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      if (sortBy === "recent") {
        const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return dateB - dateA; // Newest first
      } else if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else if (sortBy === "priority") {
        // Find priority score from priority list
        const priorityA = priorityList.find(p => p.patient.id === a.id)?.priorityScore || 0;
        const priorityB = priorityList.find(p => p.patient.id === b.id)?.priorityScore || 0;
        return priorityB - priorityA; // Higher priority first
      }
      return 0;
    });

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPatients.length / patientsPerPage);
  const paginatedPatients = filteredAndSortedPatients.slice(
    (currentPage - 1) * patientsPerPage,
    currentPage * patientsPerPage
  );

  const tabs = [
    { id: "priority", label: "Priority List", icon: "overview" },
    { id: "patients", label: "Patient Management", icon: "profile" },
    { id: "profile", label: "Profile", icon: "profile", action: "navigate" as const, href: "/nurse/profile" },
    { id: "logout", label: "Logout", action: "logout" as const },
  ];

  if (!token) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-3xl font-bold mb-4">Nurse Dashboard</h1>
          <p className="text-slate-600 mb-6">Please log in to continue.</p>
          <button
            onClick={() => router.push("/healthworker/login")}
            className="btn-primary inline-block"
          >
            Login
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Mobile Menu */}
        <MobileDashboardMenu
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(id) => {
            setActiveTab(id as "priority" | "patients");
          }}
        />

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 rounded-2xl border-2 border-blue-100 p-6 sm:p-8 mb-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <Icon name="nurse" size={28} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text">
                    Nurse Dashboard
                  </h1>
                  {hospitalClinicName && (
                    <p className="text-sm sm:text-base text-neutral-600 mt-1 flex items-center gap-2">
                      <span className="text-blue-500">🏥</span>
                      {hospitalClinicName}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="hidden md:flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => router.push("/nurse/profile")}
                className="btn-secondary flex items-center gap-2"
              >
                <Icon name="profile" size={20} />
                My Profile
              </button>
              <button
                className="btn-ghost text-sm"
                onClick={() => {
                  localStorage.removeItem("doctorToken");
                  location.href = "/";
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <MessagePopup
          isOpen={popup.isOpen}
          onClose={() => setPopup({ ...popup, isOpen: false })}
          type={popup.type}
          title={popup.title}
          message={popup.message}
        />

        {/* Main Content - Two Column Layout or Single View on Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Priority List (shown first/only on mobile by default) */}
          <div 
            ref={prioritySectionRef} 
            className={`space-y-4 order-1 lg:order-2 ${activeTab === "priority" ? "block" : "hidden"} lg:block`}
          >
            <DashboardCard title="AI Priority List">
              <p className="text-sm text-slate-600 mb-3">
                Patients are automatically prioritized based on their medical data, urgency, and needs.
              </p>
              
              {/* Search Bar for Priority List */}
              <div className="mb-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search priority patients..."
                    className="input w-full pr-11 h-10"
                    value={prioritySearchQuery}
                    onChange={(e) => setPrioritySearchQuery(e.target.value)}
                  />
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {priorityList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No priority patients at the moment.
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {priorityList
                    .map((item, originalIndex) => ({
                      ...item,
                      originalIndex,
                    }))
                    .filter((item) => {
                      if (!prioritySearchQuery) return true;
                      const query = prioritySearchQuery.toLowerCase();
                      return (
                        item.patient.name.toLowerCase().includes(query) ||
                        item.patient.phone.includes(query)
                      );
                    })
                    .map((item) => (
                    <div
                      key={item.patient.id}
                      className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-2.5"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm border-2 border-blue-200">
                          {item.originalIndex + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-800 text-[13px] mb-0.5">{item.patient.name}</h3>
                          <p className="text-[11px] text-slate-600 mb-1">
                            📞 {item.patient.phone}
                          </p>
                          <p className="text-[11px] text-blue-700 font-medium mb-1 leading-snug">
                            {item.priorityReason}
                          </p>
                          <div className="flex items-center justify-between gap-2 mt-1.5 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="priority" size="sm">
                                Score: {item.priorityScore.toFixed(1)}
                              </Badge>
                              {(() => {
                                const status = getStatus(item.patient);
                                return <Badge variant={status.variant} size="sm">{status.label}</Badge>;
                              })()}
                            </div>
                            <button
                              onClick={async () => {
                                const res = await fetch(`/api/nurse/patients/${item.patient.id}`, {
                                  headers: headers(),
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setSelectedPatient(data.patient);
                                  setPatientForm({
                                    name: data.patient.name || "",
                                    age: data.patient.age?.toString() || "",
                                    phone: data.patient.phone || "",
                                    email: data.patient.email || "",
                                    address: data.patient.address || "",
                                    bloodGroup: data.patient.bloodGroup || "",
                                    medicalHistory: data.patient.medicalHistory || "",
                                    allergies: data.patient.allergies || "",
                                    currentMedications: data.patient.currentMedications || "",
                                    emergencyContact: data.patient.emergencyContact || "",
                                    emergencyPhone: data.patient.emergencyPhone || "",
                                    notes: data.patient.notes || "",
                                  });
                                  setShowEditModal(true);
                                }
                              }}
                              className="text-[10px] px-2.5 py-0.5 rounded bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 font-semibold"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardCard>
          </div>

          {/* Patient Management (hidden on mobile unless active) */}
          <div 
            ref={patientsSectionRef} 
            className={`space-y-6 order-2 lg:order-1 ${activeTab === "patients" ? "block" : "hidden"} lg:block`} 
            id="patients"
          >
            <DashboardCard
              title="Patient Management"
              action={
                <button
                  onClick={() => {
                    // Reset form when opening add modal
                    setPatientForm({
                      name: "",
                      age: "",
                      phone: "",
                      email: "",
                      address: "",
                      bloodGroup: "",
                      medicalHistory: "",
                      allergies: "",
                      currentMedications: "",
                      emergencyContact: "",
                      emergencyPhone: "",
                      notes: "",
                    });
                    setUploadFileDescriptions({
                      prescription: "",
                      report: "",
                      document: "",
                    });
                    setShowAddModal(true);
                  }}
                  className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                >
                  <Icon name="add" size={18} />
                  Add Patient
                </button>
              }
            >
              {/* Search + Sort */}
              <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search patients by name or number..."
                      className="input w-full pr-11 h-11"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1); // Reset to first page on search
                      }}
                    />
                    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600 font-medium whitespace-nowrap">Sort by:</label>
                  <select
                    className="input text-sm py-1.5 px-3"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as "recent" | "priority" | "name");
                      setCurrentPage(1);
                    }}
                  >
                    <option value="recent">Recent</option>
                    <option value="priority">Priority</option>
                    <option value="name">Name</option>
                  </select>
                </div>
              </div>

              {/* Patient List */}
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading patients...</div>
              ) : filteredAndSortedPatients.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {searchQuery ? "No patients found matching your search." : "No patients added yet. Click 'Add Patient' to get started."}
                </div>
              ) : (
                <>
                  <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
                    {paginatedPatients.map((patient) => (
                      <PatientCard
                        key={patient.id}
                        patient={patient}
                        onEdit={async () => {
                          setSelectedPatient(patient);
                          const res = await fetch(`/api/nurse/patients/${patient.id}`, {
                            headers: headers(),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setSelectedPatient(data.patient);
                            setPatientForm({
                              name: data.patient.name || "",
                              age: data.patient.age?.toString() || "",
                              phone: data.patient.phone || "",
                              email: data.patient.email || "",
                              address: data.patient.address || "",
                              bloodGroup: data.patient.bloodGroup || "",
                              medicalHistory: data.patient.medicalHistory || "",
                              allergies: data.patient.allergies || "",
                              currentMedications: data.patient.currentMedications || "",
                              emergencyContact: data.patient.emergencyContact || "",
                              emergencyPhone: data.patient.emergencyPhone || "",
                              notes: data.patient.notes || "",
                            });
                            setShowEditModal(true);
                          }
                        }}
                        onDelete={() => handleDeletePatient(patient.id)}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                      <p className="text-sm text-slate-600">
                        Showing {(currentPage - 1) * patientsPerPage + 1} to {Math.min(currentPage * patientsPerPage, filteredAndSortedPatients.length)} of {filteredAndSortedPatients.length} patients
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="btn-secondary text-sm px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="flex items-center px-3 py-1 text-sm text-slate-600">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="btn-secondary text-sm px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </DashboardCard>
          </div>
        </div>

        {/* Add Patient Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Add New Patient</h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      // Reset form completely when closing
                      setPatientForm({
                        name: "",
                        age: "",
                        phone: "",
                        email: "",
                        address: "",
                        bloodGroup: "",
                        medicalHistory: "",
                        allergies: "",
                        currentMedications: "",
                        emergencyContact: "",
                        emergencyPhone: "",
                        notes: "",
                      });
                      setUploadFileDescriptions({
                        prescription: "",
                        report: "",
                        document: "",
                      });
                    }}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <Icon name="close" size={24} />
                  </button>
                </div>
                <form onSubmit={handleAddPatient} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={patientForm.name}
                        onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                      <input
                        type="tel"
                        className="input w-full"
                        value={patientForm.phone}
                        onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                      <input
                        type="number"
                        className="input w-full"
                        value={patientForm.age}
                        onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                        min="0"
                        max="150"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        className="input w-full"
                        value={patientForm.email}
                        onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
                      <select
                        className="input w-full"
                        value={patientForm.bloodGroup}
                        onChange={(e) => setPatientForm({ ...patientForm, bloodGroup: e.target.value })}
                      >
                        <option value="">Select</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={patientForm.emergencyContact}
                        onChange={(e) => setPatientForm({ ...patientForm, emergencyContact: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Phone</label>
                      <input
                        type="tel"
                        className="input w-full"
                        value={patientForm.emergencyPhone}
                        onChange={(e) => setPatientForm({ ...patientForm, emergencyPhone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <textarea
                      className="input w-full h-20"
                      value={patientForm.address}
                      onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Medical History</label>
                    <textarea
                      className="input w-full h-24"
                      value={patientForm.medicalHistory}
                      onChange={(e) => setPatientForm({ ...patientForm, medicalHistory: e.target.value })}
                      placeholder="Previous illnesses, surgeries, chronic conditions..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Allergies</label>
                    <textarea
                      className="input w-full h-20"
                      value={patientForm.allergies}
                      onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })}
                      placeholder="Known allergies..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Medications</label>
                    <textarea
                      className="input w-full h-20"
                      value={patientForm.currentMedications}
                      onChange={(e) => setPatientForm({ ...patientForm, currentMedications: e.target.value })}
                      placeholder="Current medications and dosages..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea
                      className="input w-full h-20"
                      value={patientForm.notes}
                      onChange={(e) => setPatientForm({ ...patientForm, notes: e.target.value })}
                      placeholder="Additional notes..."
                    />
                  </div>

                  {/* File Upload Section for Add Patient */}
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-4">Upload Files (Optional)</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      You can add files after creating the patient, or upload them now. Files will be attached after patient is created.
                    </p>
                    
                    {/* Prescriptions */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700">
                          Prescriptions
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Description (optional)"
                            className="input text-sm w-48"
                            value={uploadFileDescriptions.prescription}
                            onChange={(e) => setUploadFileDescriptions({ ...uploadFileDescriptions, prescription: e.target.value })}
                          />
                          <label className="btn-secondary text-sm cursor-pointer">
                            <Icon name="upload" size={16} />
                            Upload
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  setPopup({
                                    isOpen: true,
                                    type: "info",
                                    title: "Info",
                                    message: "Please create the patient first, then upload files in the edit modal.",
                                  });
                                  e.target.value = "";
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Reports */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700">
                          Reports
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Description (optional)"
                            className="input text-sm w-48"
                            value={uploadFileDescriptions.report}
                            onChange={(e) => setUploadFileDescriptions({ ...uploadFileDescriptions, report: e.target.value })}
                          />
                          <label className="btn-secondary text-sm cursor-pointer">
                            <Icon name="upload" size={16} />
                            Upload
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  setPopup({
                                    isOpen: true,
                                    type: "info",
                                    title: "Info",
                                    message: "Please create the patient first, then upload files in the edit modal.",
                                  });
                                  e.target.value = "";
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Documents */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700">
                          Documents
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Description (optional)"
                            className="input text-sm w-48"
                            value={uploadFileDescriptions.document}
                            onChange={(e) => setUploadFileDescriptions({ ...uploadFileDescriptions, document: e.target.value })}
                          />
                          <label className="btn-secondary text-sm cursor-pointer">
                            <Icon name="upload" size={16} />
                            Upload
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  setPopup({
                                    isOpen: true,
                                    type: "info",
                                    title: "Info",
                                    message: "Please create the patient first, then upload files in the edit modal.",
                                  });
                                  e.target.value = "";
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        // Reset form completely
                        setPatientForm({
                          name: "",
                          age: "",
                          phone: "",
                          email: "",
                          address: "",
                          bloodGroup: "",
                          medicalHistory: "",
                          allergies: "",
                          currentMedications: "",
                          emergencyContact: "",
                          emergencyPhone: "",
                          notes: "",
                        });
                        setUploadFileDescriptions({
                          prescription: "",
                          report: "",
                          document: "",
                        });
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? "Adding..." : "Add Patient"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Patient Modal */}
        {showEditModal && selectedPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Edit Patient: {selectedPatient.name}</h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedPatient(null);
                    }}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <Icon name="close" size={24} />
                  </button>
                </div>
                <form onSubmit={handleUpdatePatient} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={patientForm.name}
                        onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                      <input
                        type="tel"
                        className="input w-full"
                        value={patientForm.phone}
                        onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                      <input
                        type="number"
                        className="input w-full"
                        value={patientForm.age}
                        onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                        min="0"
                        max="150"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        className="input w-full"
                        value={patientForm.email}
                        onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
                      <select
                        className="input w-full"
                        value={patientForm.bloodGroup}
                        onChange={(e) => setPatientForm({ ...patientForm, bloodGroup: e.target.value })}
                      >
                        <option value="">Select</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={patientForm.emergencyContact}
                        onChange={(e) => setPatientForm({ ...patientForm, emergencyContact: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Phone</label>
                      <input
                        type="tel"
                        className="input w-full"
                        value={patientForm.emergencyPhone}
                        onChange={(e) => setPatientForm({ ...patientForm, emergencyPhone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <textarea
                      className="input w-full h-20"
                      value={patientForm.address}
                      onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Medical History</label>
                    <textarea
                      className="input w-full h-24"
                      value={patientForm.medicalHistory}
                      onChange={(e) => setPatientForm({ ...patientForm, medicalHistory: e.target.value })}
                      placeholder="Previous illnesses, surgeries, chronic conditions..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Allergies</label>
                    <textarea
                      className="input w-full h-20"
                      value={patientForm.allergies}
                      onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })}
                      placeholder="Known allergies..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Medications</label>
                    <textarea
                      className="input w-full h-20"
                      value={patientForm.currentMedications}
                      onChange={(e) => setPatientForm({ ...patientForm, currentMedications: e.target.value })}
                      placeholder="Current medications and dosages..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea
                      className="input w-full h-20"
                      value={patientForm.notes}
                      onChange={(e) => setPatientForm({ ...patientForm, notes: e.target.value })}
                      placeholder="Additional notes..."
                    />
                  </div>

                  {/* File Management Section */}
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-4">File Management</h3>
                    
                    {/* Prescriptions */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700">
                          Prescriptions ({selectedPatient.prescriptions?.length || 0})
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Description (optional)"
                            className="input text-sm w-48"
                            value={uploadFileDescriptions.prescription}
                            onChange={(e) => setUploadFileDescriptions({ ...uploadFileDescriptions, prescription: e.target.value })}
                          />
                          <label className="btn-secondary text-sm cursor-pointer">
                            <Icon name="upload" size={16} />
                            Upload
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="hidden"
                              onChange={(e) => {
                                setUploadFileType("prescription");
                                handleFileUpload(e, "prescription");
                              }}
                              disabled={uploadingFile}
                            />
                          </label>
                        </div>
                      </div>
                      {selectedPatient.prescriptions && selectedPatient.prescriptions.length > 0 && (
                        <div className="space-y-2">
                          {selectedPatient.prescriptions.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                              <div className="flex-1">
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  {file.fileName}
                                </a>
                                {file.description && (
                                  <p className="text-xs text-slate-500">{file.description}</p>
                                )}
                                <p className="text-xs text-slate-400">
                                  Uploaded by {file.uploadedByName} on {new Date(file.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeleteFile(file.id, "prescription")}
                                className="btn-ghost text-xs text-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Reports */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700">
                          Reports ({selectedPatient.reports?.length || 0})
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Description (optional)"
                            className="input text-sm w-48"
                            value={uploadFileDescriptions.report}
                            onChange={(e) => setUploadFileDescriptions({ ...uploadFileDescriptions, report: e.target.value })}
                          />
                          <label className="btn-secondary text-sm cursor-pointer">
                            <Icon name="upload" size={16} />
                            Upload
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="hidden"
                              onChange={(e) => {
                                setUploadFileType("report");
                                handleFileUpload(e, "report");
                              }}
                              disabled={uploadingFile}
                            />
                          </label>
                        </div>
                      </div>
                      {selectedPatient.reports && selectedPatient.reports.length > 0 && (
                        <div className="space-y-2">
                          {selectedPatient.reports.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                              <div className="flex-1">
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  {file.fileName}
                                </a>
                                {file.description && (
                                  <p className="text-xs text-slate-500">{file.description}</p>
                                )}
                                <p className="text-xs text-slate-400">
                                  Uploaded by {file.uploadedByName} on {new Date(file.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeleteFile(file.id, "report")}
                                className="btn-ghost text-xs text-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Documents */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700">
                          Documents ({selectedPatient.documents?.length || 0})
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Description (optional)"
                            className="input text-sm w-48"
                            value={uploadFileDescriptions.document}
                            onChange={(e) => setUploadFileDescriptions({ ...uploadFileDescriptions, document: e.target.value })}
                          />
                          <label className="btn-secondary text-sm cursor-pointer">
                            <Icon name="upload" size={16} />
                            Upload
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="hidden"
                              onChange={(e) => {
                                setUploadFileType("document");
                                handleFileUpload(e, "document");
                              }}
                              disabled={uploadingFile}
                            />
                          </label>
                        </div>
                      </div>
                      {selectedPatient.documents && selectedPatient.documents.length > 0 && (
                        <div className="space-y-2">
                          {selectedPatient.documents.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                              <div className="flex-1">
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  {file.fileName}
                                </a>
                                {file.description && (
                                  <p className="text-xs text-slate-500">{file.description}</p>
                                )}
                                <p className="text-xs text-slate-400">
                                  Uploaded by {file.uploadedByName} on {new Date(file.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeleteFile(file.id, "document")}
                                className="btn-ghost text-xs text-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setSelectedPatient(null);
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? "Updating..." : "Update Patient"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Chat Button */}
      <Link
        href="/chat"
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 group"
        title="Chat with MomsCare AI"
      >
        <Icon name="chat" size={24} className="text-white" />
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          AI
        </span>
      </Link>
    </Layout>
  );
}

