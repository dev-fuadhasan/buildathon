"use client";

import DashboardCard from "@/components/DashboardCard";
import Layout from "@/components/Layout";
import ListCard from "@/components/ListCard";
import DetailModal from "@/components/DetailModal";
import MessagePopup from "@/components/MessagePopup";
import MobileDashboardMenu from "@/components/MobileDashboardMenu";
import Icon from "@/components/Icon";
import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { safeAsync } from "@/lib/safeAsync";

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
  role?: "doctor" | "nurse" | "others";
  specialty?: string;
  bmdcNumber?: string;
  clinicName?: string;
  hospitalClinicName?: string;
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
  timezone?: string;
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

type AdminActivity = {
  id: string;
  adminId: string;
  adminEmail: string;
  adminType: "super_admin" | "editor";
  action: string;
  targetType: "doctor" | "mother" | "question" | "report" | "editor" | "system";
  targetId: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
};

type Editor = {
  id: string;
  email: string;
  name?: string;
  lastActivity?: string;
  isPaused: boolean;
  totalActivities: number;
  status?: "active" | "paused" | "deleted";
  createdAt?: string;
};

export default function AdminDashboard() {
  const [token, setToken] = useState("");
  const [adminType, setAdminType] = useState<"super_admin" | "editor" | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [pending, setPending] = useState<Doctor[]>([]);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [allMothers, setAllMothers] = useState<Mother[]>([]);
  const [allNurses, setAllNurses] = useState<Doctor[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "doctors" | "mothers" | "nurses" | "reports" | "editors" | "activity-logs" | "settings">("overview");
  const [adminSettings, setAdminSettings] = useState<{
    morningRecommendationHour: number;
    morningRecommendationMinute: number;
    eveningRecommendationHour: number;
    eveningRecommendationMinute: number;
    questionHour: number;
    questionMinute: number;
    questionsPerDay: number;
    dailyQuestionsEnabled: boolean;
  } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [allActivities, setAllActivities] = useState<AdminActivity[]>([]); // Store all activities for client-side filtering
  const [editors, setEditors] = useState<Editor[]>([]);
  const [selectedEditor, setSelectedEditor] = useState<Editor | null>(null);
  const [createEditorModal, setCreateEditorModal] = useState(false);
  const [newEditor, setNewEditor] = useState({ email: "", password: "", name: "" });
  const [creatingEditor, setCreatingEditor] = useState(false);
  const [activityFilters, setActivityFilters] = useState<{
    adminEmail?: string;
    adminType?: "super_admin" | "editor" | "all";
    ipAddress?: string;
    targetType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }>({});
  const [analytics, setAnalytics] = useState<any>(null);
  const [vectorAnalytics, setVectorAnalytics] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedMother, setSelectedMother] = useState<Mother | null>(null);
  const [motherConversations, setMotherConversations] = useState<any[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
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
  const [nurseSearch, setNurseSearch] = useState("");
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
  const [popup, setPopup] = useState<{ isOpen: boolean; type: "success" | "error" | "warning" | "info"; title: string; message: string }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

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
      // Load conversations for this mother
      loadMotherConversations(motherId);
    }
  };

  const loadMotherConversations = async (motherId: string) => {
    setLoadingConversations(true);
    try {
      const res = await fetch(`/api/admin/mother-conversations?motherId=${motherId}`, {
        headers: headers(),
      });
      if (res.ok) {
        const data = await res.json();
        setMotherConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
      setMotherConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    const t = localStorage.getItem("adminToken") || "";
    setToken(t);
    if (t) {
      // Parse token to get admin type
      try {
        const payload = JSON.parse(atob(t.split('.')[1]));
        setAdminType(payload.adminType || "editor");
        setAdminEmail(payload.email || "");
      } catch (err) {
        console.error("Failed to parse admin token:", err);
        setAdminType("editor"); // Default to editor if parsing fails
      }
      
      // Restore active tab from localStorage
      const savedTab = localStorage.getItem("adminDashboardTab");
      if (savedTab && ["overview", "analytics", "doctors", "mothers", "nurses", "reports", "editors", "activity-logs", "settings"].includes(savedTab)) {
        setActiveTab(savedTab as any);
      }
      
      loadPending(t);
      loadOverview(t);
      loadAllDoctors(t);
      loadAllMothers(t);
      loadAllNurses(t);
      loadAnalytics(t);
      loadReports(t);
      
      // Load editors, activities, and settings if super admin (will be loaded after adminType is set)
      
      // Set up real-time updates
      
      // Frequent updates (every 30 seconds) - for pending doctors and reports
      const frequentInterval = setInterval(() => {
        loadPending(t); // Check for new doctor applications
        loadReports(t); // Check for new reports
      }, 30 * 1000); // Every 30 seconds
      
      // Medium updates (every 2 minutes) - for overview and lists
      const mediumInterval = setInterval(() => {
        loadOverview(t);
        loadAllDoctors(t);
        loadAllMothers(t);
        loadAllNurses(t);
      }, 2 * 60 * 1000); // Every 2 minutes
      
      // Less frequent updates (every 5 minutes) - for analytics
      const slowInterval = setInterval(() => {
        loadAnalytics(t);
        loadVectorAnalytics(t);
      }, 5 * 60 * 1000); // Every 5 minutes
      
      return () => {
        clearInterval(frequentInterval);
        clearInterval(mediumInterval);
        clearInterval(slowInterval);
      };
    }
  }, []);
  
  // Load editors, activities, and settings when adminType is set
  useEffect(() => {
    if (token && adminType === "super_admin") {
      loadEditors(token);
      loadActivities(token);
      loadAdminSettings(token);
    }
  }, [adminType, token]);

  // Save active tab to localStorage when it changes
  useEffect(() => {
    if (token) {
      localStorage.setItem("adminDashboardTab", activeTab);
    }
  }, [activeTab, token]);
  
  // Redirect to dashboard if logged in and on home page
  useEffect(() => {
    if (token && typeof window !== "undefined" && window.location.pathname === "/") {
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

  const loadVectorAnalytics = async (t = token) => {
    if (adminType !== "super_admin") return;
    const res = await fetch("/api/admin/vector-analytics", { headers: headers(t) });
    if (res.ok) {
      const data = await res.json();
      setVectorAnalytics(data.analytics);
    }
  };

  const loadAllMothers = async (t = token) => {
    const res = await fetch("/api/admin/mothers", { headers: headers(t) });
    if (res.ok) {
      const data = await res.json();
      setAllMothers(data.mothers || []);
    }
  };

  const loadAllNurses = async (t = token) => {
    const res = await fetch("/api/admin/nurses", { headers: headers(t) });
    if (res.ok) {
      const data = await res.json();
      setAllNurses(data.nurses || []);
    }
  };

  const loadReports = async (t = token) => {
    const res = await fetch("/api/admin/reports", { headers: headers(t) });
    if (res.ok) {
      const data = await res.json();
      setReports(data.reports || []);
    }
  };

  const createEditor = async () => {
    if (!newEditor.email || !newEditor.password) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Validation Error",
        message: "Email and password are required",
      });
      return;
    }

    if (newEditor.password.length < 6) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Validation Error",
        message: "Password must be at least 6 characters long",
      });
      return;
    }

    try {
      setCreatingEditor(true);
      const res = await fetch("/api/admin/editors/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({
          email: newEditor.email,
          password: newEditor.password,
          name: newEditor.name || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPopup({
          isOpen: true,
          type: "success",
          title: "Success",
          message: "Editor created successfully",
        });
        setCreateEditorModal(false);
        setNewEditor({ email: "", password: "", name: "" });
        loadEditors();
      } else {
        setPopup({
          isOpen: true,
          type: "error",
          title: "Error",
          message: data.error || "Failed to create editor",
        });
      }
    } catch (err) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Network Error",
        message: "Network error. Please try again.",
      });
    } finally {
      setCreatingEditor(false);
    }
  };

  const loadEditors = async (t = token) => {
    const res = await fetch("/api/admin/editors", { headers: headers(t) });
    if (res.ok) {
      const data = await res.json();
      setEditors(data.editors || []);
    }
  };

  const loadActivities = async (t = token, filterAdminId?: string) => {
    const url = filterAdminId 
      ? `/api/admin/activities?limit=1000&adminId=${filterAdminId}`
      : `/api/admin/activities?limit=1000`;
    const res = await fetch(url, { headers: headers(t) });
    if (res.ok) {
      const data = await res.json();
      // Sort by timestamp descending (newest first)
      const sorted = (data.activities || []).sort((a: AdminActivity, b: AdminActivity) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setAllActivities(sorted);
      applyActivityFilters(sorted);
    }
  };

  const applyActivityFilters = (activitiesToFilter: AdminActivity[] = allActivities) => {
    let filtered = [...activitiesToFilter];

    if (activityFilters.adminEmail) {
      filtered = filtered.filter(a => 
        a.adminEmail.toLowerCase().includes(activityFilters.adminEmail!.toLowerCase())
      );
    }

    if (activityFilters.adminType && activityFilters.adminType !== "all") {
      filtered = filtered.filter(a => a.adminType === activityFilters.adminType);
    }

    if (activityFilters.ipAddress) {
      filtered = filtered.filter(a => 
        a.ipAddress?.toLowerCase().includes(activityFilters.ipAddress!.toLowerCase())
      );
    }

    if (activityFilters.targetType) {
      filtered = filtered.filter(a => a.targetType === activityFilters.targetType);
    }

    if (activityFilters.action) {
      filtered = filtered.filter(a => 
        a.action.toLowerCase().includes(activityFilters.action!.toLowerCase())
      );
    }

    if (activityFilters.startDate) {
      const start = new Date(activityFilters.startDate);
      filtered = filtered.filter(a => new Date(a.timestamp) >= start);
    }

    if (activityFilters.endDate) {
      const end = new Date(activityFilters.endDate);
      end.setHours(23, 59, 59, 999); // Include entire end date
      filtered = filtered.filter(a => new Date(a.timestamp) <= end);
    }

    setActivities(filtered);
  };

  // Apply filters when they change
  useEffect(() => {
    if (allActivities.length > 0) {
      applyActivityFilters(allActivities);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityFilters, allActivities.length]);

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

  const loadAdminSettings = async (t = token) => {
    try {
      const res = await fetch("/api/admin/settings", { headers: headers(t) });
      if (res.ok) {
        const data = await res.json();
        setAdminSettings(data.settings);
      }
    } catch (err) {
      console.error("Error loading admin settings:", err);
    }
  };

  const saveAdminSettings = async () => {
    if (!adminSettings) return;
    
    try {
      setSavingSettings(true);
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...headers(),
        },
        body: JSON.stringify(adminSettings),
      });
      
      const data = await res.json();
      if (res.ok) {
        setPopup({
          isOpen: true,
          type: "success",
          title: "Settings Saved",
          message: "Admin settings have been updated successfully.",
        });
        setAdminSettings(data.settings);
      } else {
        setPopup({
          isOpen: true,
          type: "error",
          title: "Save Failed",
          message: data.error || "Failed to save settings. Please try again.",
        });
      }
    } catch (err) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Network Error",
        message: "Network error. Please try again.",
      });
    } finally {
      setSavingSettings(false);
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
        const displayType = userType === "doctor" ? "health worker" : userType;
        setPopup({
          isOpen: true,
          type: "success",
          title: pause ? "User Paused" : "User Unpaused",
          message: `The ${displayType} has been ${pause ? "paused" : "unpaused"} successfully. ${pause ? "They will be automatically logged out if currently logged in." : ""}`,
        });
        if (userType === "doctor") {
          loadAllDoctors();
        } else {
          loadAllMothers();
        }
      } else {
        setPopup({
          isOpen: true,
          type: "error",
          title: "Operation Failed",
          message: data.error || "Failed to update user status. Please try again.",
        });
      }
    } catch (err) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Network Error",
        message: "Network error. Please try again.",
      });
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
        setMessage("✅ Health Worker deleted successfully");
        closeActionModal();
        loadPending();
        loadAllDoctors();
        loadOverview();
      } else {
        setMessage(`❌ ${data.error || "Failed to delete health worker"}`);
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
      setMessage(`✅ Health Worker ${actionModal.action === "approve" ? "approved" : "rejected"} successfully`);
      closeActionModal();
      loadPending();
      loadAllDoctors();
      loadOverview();
    } else {
      setMessage(`❌ ${data.error || "Failed to update health worker"}`);
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

  const tabs = [
    { id: "overview", label: "Overview", icon: "overview" },
    { id: "analytics", label: "Analytics", icon: "progress" },
    { id: "doctors", label: "Doctors", icon: "doctor" },
    { id: "mothers", label: "Mothers", icon: "mom" },
    { id: "nurses", label: "Health Workers", icon: "nurse" },
    { id: "reports", label: "Reports", icon: "reports", badge: reports.filter((r: any) => !r.reportStatus || r.reportStatus === "pending").length },
    ...(adminType === "super_admin" ? [
      { id: "editors", label: "Editors", icon: "editor" },
      { id: "activity-logs", label: "Activity Logs", icon: "log" },
      { id: "settings", label: "Settings", icon: "settings" },
    ] : []),
    { id: "dashboard", label: "Dashboard", icon: "overview", action: "navigate" as const, href: "/admin/dashboard" },
    { id: "logout", label: "Logout", action: "logout" as const },
  ];

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-8 px-2 sm:px-0 pb-20 lg:pb-0">
        {/* Mobile Menu */}
        <MobileDashboardMenu tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as any)} />
        {/* Header - Redesigned */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold gradient-text mb-2 sm:mb-3">
              Admin Dashboard
            </h1>
            <p className="text-sm sm:text-lg text-neutral-600">
              {adminType === "super_admin" ? "Super Admin - Full access to manage MomsCare platform" : `Editor - ${adminEmail}`}
            </p>
          </div>
          <button
            className="btn-ghost hidden md:inline-flex"
            onClick={() => {
              localStorage.removeItem("adminToken");
              location.href = "/";
            }}
          >
            Logout
          </button>
        </div>

        <MessagePopup
          isOpen={popup.isOpen}
          onClose={() => setPopup({ ...popup, isOpen: false })}
          type={popup.type}
          title={popup.title}
          message={popup.message}
        />

        {/* Message Alert - For simple messages */}
        {message && !popup.isOpen && (
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

        {/* Tabs - Desktop Only with Arrow Navigation */}
        <div className="hidden lg:flex items-center gap-2 border-b-2 border-neutral-200 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-hide relative">
          {/* Left Arrow */}
          <button
            onClick={() => {
              const currentIndex = tabs.findIndex(t => t.id === activeTab);
              if (currentIndex > 0) {
                setActiveTab(tabs[currentIndex - 1].id as any);
              }
            }}
            className="flex-shrink-0 p-2 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={tabs.findIndex(t => t.id === activeTab) === 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          <div className="flex gap-2 flex-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`tab flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3.5 whitespace-nowrap text-sm sm:text-base ${
                  activeTab === tab.id ? "tab-active" : "tab-inactive"
                }`}
              >
                {tab.icon && <Icon name={tab.icon} size={20} />}
                <span>{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="ml-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Right Arrow */}
          <button
            onClick={() => {
              const currentIndex = tabs.findIndex(t => t.id === activeTab);
              if (currentIndex < tabs.length - 1) {
                setActiveTab(tabs[currentIndex + 1].id as any);
              }
            }}
            className="flex-shrink-0 p-2 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={tabs.findIndex(t => t.id === activeTab) === tabs.length - 1}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {overview && (
              <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                <DashboardCard title={
                  <span className="flex items-center gap-1.5">
                    <Icon name="mom" size={16} />
                    <span className="text-xs sm:text-sm">Total Mothers</span>
                  </span>
                } className="py-3">
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                    {overview.mothers}
                  </div>
                </DashboardCard>
                <DashboardCard title={
                  <span className="flex items-center gap-1.5">
                    <Icon name="doctor" size={16} />
                    <span className="text-xs sm:text-sm">Approved Doctors</span>
                  </span>
                } className="py-3">
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {overview.doctors}
                  </div>
                </DashboardCard>
                <DashboardCard title={
                  <span className="flex items-center gap-1.5">
                    <Icon name="pending" size={16} />
                    <span className="text-xs sm:text-sm">Pending Doctors</span>
                  </span>
                } className="py-3">
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                    {overview.pendingDoctors}
                  </div>
                </DashboardCard>
                <DashboardCard title={
                  <span className="flex items-center gap-1.5">
                    <Icon name="question" size={16} />
                    <span className="text-xs sm:text-sm">Total Questions</span>
                  </span>
                } className="py-3">
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    {overview.questions}
                  </div>
                </DashboardCard>
                <DashboardCard title={
                  <span className="flex items-center gap-1.5">
                    <Icon name="success" size={16} />
                    <span className="text-xs sm:text-sm">Answered</span>
                  </span>
                } className="py-3">
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {overview.answered}
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
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
                Pending Health Worker Approvals
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
                          <p className="font-semibold text-lg">{d.name || "Unnamed health worker"}</p>
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

            {/* Vector Search Analytics Section - Only for Super Admin */}
            {adminType === "super_admin" && (
              <div className="mt-8 space-y-6">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
                  <h2 className="text-2xl font-bold mb-2">🔍 Vector Search Analytics</h2>
                  <p className="text-purple-100">Real-time statistics showing how your own dataset (677 Q&A pairs) is being used with vector embeddings</p>
                </div>

                {vectorAnalytics ? (
                  <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                      <DashboardCard title="Total Searches">
                        <div className="text-4xl font-bold text-purple-600">
                          {vectorAnalytics.totalSearches}
                        </div>
                        <p className="text-sm text-slate-500 mt-2">All time searches</p>
                      </DashboardCard>
                      <DashboardCard title="Vector Search Usage">
                        <div className="text-4xl font-bold text-green-600">
                          {vectorAnalytics.vectorSearchPercentage.toFixed(1)}%
                        </div>
                        <p className="text-sm text-slate-500 mt-2">
                          {vectorAnalytics.vectorSearches} vector / {vectorAnalytics.keywordSearches} keyword
                        </p>
                      </DashboardCard>
                      <DashboardCard title="Avg Similarity Score">
                        <div className="text-4xl font-bold text-blue-600">
                          {vectorAnalytics.averageSimilarity.toFixed(3)}
                        </div>
                        <p className="text-sm text-slate-500 mt-2">Out of 1.0 (higher is better)</p>
                      </DashboardCard>
                      <DashboardCard title="Dataset Size">
                        <div className="text-4xl font-bold text-pink-600">
                          {vectorAnalytics.totalEmbeddings}
                        </div>
                        <p className="text-sm text-slate-500 mt-2">Q&A pairs in dataset</p>
                      </DashboardCard>
                    </div>

                    {/* Search Method Comparison */}
                    <DashboardCard title="Search Method Distribution">
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">Vector Search</span>
                            <span className="text-sm text-slate-600">
                              {vectorAnalytics.vectorSearches} ({vectorAnalytics.vectorSearches > 0 && vectorAnalytics.totalSearches > 0 ? ((vectorAnalytics.vectorSearches / vectorAnalytics.totalSearches) * 100).toFixed(1) : 0}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-4">
                            <div
                              className="bg-green-500 h-4 rounded-full transition-all"
                              style={{
                                width: `${vectorAnalytics.totalSearches > 0 ? (vectorAnalytics.vectorSearches / vectorAnalytics.totalSearches) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">Hybrid Search</span>
                            <span className="text-sm text-slate-600">
                              {vectorAnalytics.hybridSearches} ({vectorAnalytics.hybridSearches > 0 && vectorAnalytics.totalSearches > 0 ? ((vectorAnalytics.hybridSearches / vectorAnalytics.totalSearches) * 100).toFixed(1) : 0}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-4">
                            <div
                              className="bg-purple-500 h-4 rounded-full transition-all"
                              style={{
                                width: `${vectorAnalytics.totalSearches > 0 ? (vectorAnalytics.hybridSearches / vectorAnalytics.totalSearches) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">Keyword Search (Fallback)</span>
                            <span className="text-sm text-slate-600">
                              {vectorAnalytics.keywordSearches} ({vectorAnalytics.keywordSearches > 0 && vectorAnalytics.totalSearches > 0 ? ((vectorAnalytics.keywordSearches / vectorAnalytics.totalSearches) * 100).toFixed(1) : 0}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-4">
                            <div
                              className="bg-orange-500 h-4 rounded-full transition-all"
                              style={{
                                width: `${vectorAnalytics.totalSearches > 0 ? (vectorAnalytics.keywordSearches / vectorAnalytics.totalSearches) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </DashboardCard>

                    {/* Similarity Distribution */}
                    <div className="grid gap-6 md:grid-cols-2">
                      <DashboardCard title="Similarity Score Distribution">
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium text-green-700">High Similarity (&gt; 0.7)</span>
                              <span className="text-sm text-slate-600">{vectorAnalytics.similarityDistribution.high}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3">
                              <div
                                className="bg-green-500 h-3 rounded-full"
                                style={{
                                  width: `${vectorAnalytics.vectorSearches > 0 ? (vectorAnalytics.similarityDistribution.high / vectorAnalytics.vectorSearches) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium text-yellow-700">Medium Similarity (0.4 - 0.7)</span>
                              <span className="text-sm text-slate-600">{vectorAnalytics.similarityDistribution.medium}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3">
                              <div
                                className="bg-yellow-500 h-3 rounded-full"
                                style={{
                                  width: `${vectorAnalytics.vectorSearches > 0 ? (vectorAnalytics.similarityDistribution.medium / vectorAnalytics.vectorSearches) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium text-red-700">Low Similarity (&lt; 0.4)</span>
                              <span className="text-sm text-slate-600">{vectorAnalytics.similarityDistribution.low}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3">
                              <div
                                className="bg-red-500 h-3 rounded-full"
                                style={{
                                  width: `${vectorAnalytics.vectorSearches > 0 ? (vectorAnalytics.similarityDistribution.low / vectorAnalytics.vectorSearches) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </DashboardCard>

                      <DashboardCard title="Language Distribution">
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium text-slate-700">English</span>
                              <span className="text-sm text-slate-600">{vectorAnalytics.searchesByLanguage.en}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3">
                              <div
                                className="bg-blue-500 h-3 rounded-full"
                                style={{
                                  width: `${vectorAnalytics.totalSearches > 0 ? (vectorAnalytics.searchesByLanguage.en / vectorAnalytics.totalSearches) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium text-slate-700">Bangla</span>
                              <span className="text-sm text-slate-600">{vectorAnalytics.searchesByLanguage.bn}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3">
                              <div
                                className="bg-green-500 h-3 rounded-full"
                                style={{
                                  width: `${vectorAnalytics.totalSearches > 0 ? (vectorAnalytics.searchesByLanguage.bn / vectorAnalytics.totalSearches) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </DashboardCard>
                    </div>

                    {/* Performance Metrics */}
                    <DashboardCard title="Performance Metrics">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-slate-600">Average Search Time</p>
                          <p className="text-2xl font-bold text-purple-600">{vectorAnalytics.averageSearchTime.toFixed(0)}ms</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Embeddings Status</p>
                          <p className={`text-2xl font-bold ${vectorAnalytics.embeddingsLoaded ? 'text-green-600' : 'text-red-600'}`}>
                            {vectorAnalytics.embeddingsLoaded ? '✅ Loaded' : '❌ Not Loaded'}
                          </p>
                        </div>
                      </div>
                    </DashboardCard>

                    {/* Top Queries */}
                    {vectorAnalytics.topQueries && vectorAnalytics.topQueries.length > 0 && (
                      <DashboardCard title="Most Searched Questions">
                        <div className="space-y-2">
                          {vectorAnalytics.topQueries.map((item: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <span className="text-sm text-slate-700 flex-1">{item.query}</span>
                              <span className="text-sm font-bold text-purple-600 ml-4">{item.count}x</span>
                            </div>
                          ))}
                        </div>
                      </DashboardCard>
                    )}

                    {/* Recent Searches */}
                    {vectorAnalytics.recentSearches && vectorAnalytics.recentSearches.length > 0 && (
                      <DashboardCard title="Recent Searches (Last 10)">
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {vectorAnalytics.recentSearches.slice(0, 10).map((search: any, index: number) => (
                            <div key={index} className="p-3 bg-slate-50 rounded-lg text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-slate-700">{search.query.substring(0, 50)}...</span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  search.method === 'vector' ? 'bg-green-100 text-green-700' :
                                  search.method === 'hybrid' ? 'bg-purple-100 text-purple-700' :
                                  'bg-orange-100 text-orange-700'
                                }`}>
                                  {search.method}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span>Results: {search.resultsCount}</span>
                                {search.bestSimilarity && (
                                  <span>Similarity: {search.bestSimilarity.toFixed(3)}</span>
                                )}
                                <span>{new Date(search.timestamp).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </DashboardCard>
                    )}
                  </div>
                ) : (
                  <DashboardCard title="Vector Search Analytics">
                    <p className="text-slate-500 text-center py-8">Loading vector search analytics...</p>
                  </DashboardCard>
                )}
              </div>
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
                    title={d.name || "Unnamed health worker"}
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
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to delete mother "${m.name || m.email}"? This action cannot be undone.`)) {
                                await deleteUser(m.id, "mother");
                              }
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

        {/* Health Workers Tab */}
        {activeTab === "nurses" && (
          <DashboardCard title="All Health Workers">
            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="🔍 Search health workers by name, email, hospital/clinic..."
                className="input w-full"
                value={nurseSearch}
                onChange={(e) => setNurseSearch(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              {allNurses.filter(n => {
                if (!nurseSearch) return true;
                const search = nurseSearch.toLowerCase();
                return (
                  n.name?.toLowerCase().includes(search) ||
                  n.email.toLowerCase().includes(search) ||
                  n.hospitalClinicName?.toLowerCase().includes(search) ||
                  n.clinicName?.toLowerCase().includes(search) ||
                  n.phone?.toLowerCase().includes(search)
                );
              }).length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  {nurseSearch ? "No health workers found matching your search." : "No health workers registered yet."}
                </p>
              ) : (
                allNurses.filter(n => {
                  if (!nurseSearch) return true;
                  const search = nurseSearch.toLowerCase();
                  return (
                    n.name?.toLowerCase().includes(search) ||
                    n.email.toLowerCase().includes(search) ||
                    n.hospitalClinicName?.toLowerCase().includes(search) ||
                    n.clinicName?.toLowerCase().includes(search) ||
                    n.phone?.toLowerCase().includes(search)
                  );
                }).map((n) => (
                  <ListCard
                    key={n.id}
                    title={n.name || "Unnamed health worker"}
                    subtitle={n.email}
                    badge={
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        n.status === "approved" 
                          ? "bg-green-100 text-green-700"
                          : n.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {n.status}
                      </span>
                    }
                    onClick={() => loadDoctorDetails(n.id)}
                  >
                    <p className="text-xs text-slate-500 mt-1">
                      Role: Other Health Worker
                    </p>
                    {n.hospitalClinicName && (
                      <p className="text-xs text-slate-500 mt-1">
                        Hospital/Clinic: {n.hospitalClinicName}
                      </p>
                    )}
                    {n.phone && (
                      <p className="text-xs text-slate-500 mt-1">
                        📞 {n.phone}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <button
                        className={`${
                          n.status === "approved"
                            ? "bg-orange-500 hover:bg-orange-600"
                            : "bg-green-500 hover:bg-green-600"
                        } text-white text-xs py-1 px-3 rounded transition-colors`}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setActionModal({ doctorId: n.id, action: n.status === "approved" ? "reject" : "approve", comment: "" });
                        }}
                      >
                        {n.status === "approved" ? "Reject" : "Approve"}
                      </button>
                      <button
                        className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-3 rounded transition-colors"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete "${n.name || n.email}"? This action cannot be undone.`)) {
                            setActionModal({ doctorId: n.id, action: "delete", comment: "" });
                          }
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

        {/* Health Worker Details Modal */}
        <DetailModal
          isOpen={!!selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          title={`Health Worker Details: ${selectedDoctor?.name || "N/A"}`}
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
                        onClick={safeAsync(async () => {
                          await updateReportStatus(selectedReport.id, "solved", adminDecisionText);
                          setAdminDecisionText("");
                        })}
                        disabled={!adminDecisionText.trim()}
                      >
                        <span className="flex items-center gap-2">
                          <Icon name="success" size={18} />
                          Mark as Solved
                        </span>
                      </button>
                      <button
                        className="btn-primary bg-red-500 hover:bg-red-600 flex-1"
                        onClick={safeAsync(async () => {
                          await updateReportStatus(selectedReport.id, "rejected", adminDecisionText);
                          setAdminDecisionText("");
                        })}
                        disabled={!adminDecisionText.trim()}
                      >
                        <span className="flex items-center gap-2">
                          <Icon name="reject" size={18} />
                          Mark as Rejected
                        </span>
                      </button>
                      <button
                        className="btn-secondary flex-1"
                        onClick={safeAsync(async () => {
                          await updateReportStatus(selectedReport.id, "pending", adminDecisionText || undefined);
                          setAdminDecisionText("");
                        })}
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
                  <p className="text-sm font-medium text-slate-600">Timezone</p>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <Icon name="clock" size={18} className="text-blue-500" />
                    {selectedMother.timezone || "Not set"}
                  </p>
                  {selectedMother.timezone && (
                    <p className="text-xs text-slate-500 mt-1">
                      Recommendations sent at 8 AM & 8 PM local time
                    </p>
                  )}
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

              {/* Chat Conversations Section */}
              <div className="border-t border-slate-200 pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Icon name="chat" size={20} />
                    AI Chat Conversations ({motherConversations.length})
                  </h3>
                  <button
                    onClick={() => loadMotherConversations(selectedMother.id)}
                    disabled={loadingConversations}
                    className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-2"
                  >
                    <Icon name="sync" size={16} className={loadingConversations ? "animate-spin" : ""} />
                    Refresh
                  </button>
                </div>

                {loadingConversations ? (
                  <div className="text-center py-8">
                    <Icon name="pending" size={32} className="mx-auto mb-2 text-slate-400 animate-spin" />
                    <p className="text-slate-500">Loading conversations...</p>
                  </div>
                ) : motherConversations.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
                    <Icon name="chat" size={48} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-lg font-medium mb-2">No conversations yet</p>
                    <p className="text-sm">This mother hasn't started any AI chat conversations.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {motherConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => setSelectedConversation(conversation)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-800 mb-1 truncate">
                              {conversation.title || "Untitled Conversation"}
                            </h4>
                            <p className="text-sm text-slate-600 mb-2">
                              {conversation.messages?.length || 0} messages
                            </p>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Icon name="clock" size={14} />
                                Created: {new Date(conversation.createdAt).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Icon name="clock" size={14} />
                                Updated: {new Date(conversation.updatedAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <Icon name="view" size={20} className="text-blue-500 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DetailModal>

        {/* Conversation Details Modal */}
        <DetailModal
          isOpen={!!selectedConversation}
          onClose={() => setSelectedConversation(null)}
          title={selectedConversation?.title || "Conversation Details"}
        >
          {selectedConversation && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-slate-600 mb-4 pb-4 border-b border-slate-200">
                <span className="flex items-center gap-2">
                  <Icon name="clock" size={16} />
                  Created: {new Date(selectedConversation.createdAt).toLocaleString()}
                </span>
                <span className="flex items-center gap-2">
                  <Icon name="clock" size={16} />
                  Updated: {new Date(selectedConversation.updatedAt).toLocaleString()}
                </span>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {selectedConversation.messages && selectedConversation.messages.length > 0 ? (
                  selectedConversation.messages.map((message: any, index: number) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg ${
                        message.role === "user"
                          ? "bg-blue-50 border border-blue-200 ml-8"
                          : "bg-slate-50 border border-slate-200 mr-8"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.role === "user"
                              ? "bg-blue-500 text-white"
                              : "bg-slate-500 text-white"
                          }`}
                        >
                          {message.role === "user" ? (
                            <Icon name="mom" size={16} />
                          ) : (
                            <Icon name="chat" size={16} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-800">
                              {message.role === "user" ? "Mother" : "MomsCare AI"}
                            </span>
                            {message.timestamp && (
                              <span className="text-xs text-slate-500">
                                {new Date(message.timestamp).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-700 whitespace-pre-wrap break-words">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p>No messages in this conversation.</p>
                  </div>
                )}
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
                      Approve Health Worker
                    </span>
                  )
                  : actionModal.action === "reject"
                  ? (
                    <span className="flex items-center gap-2">
                      <Icon name="reject" size={18} />
                      Reject Health Worker
                    </span>
                  )
                  : (
                    <span className="flex items-center gap-2">
                      <Icon name="delete" size={18} />
                      Delete Health Worker
                    </span>
                  )}
              </h2>
              {actionModal.action === "delete" ? (
                <>
                  <p className="text-red-600 font-semibold mb-4">
                    <span className="flex items-start gap-2">
                      <Icon name="warning" size={20} className="mt-0.5" />
                      <span>Are you sure you want to delete this health worker? This action cannot be undone.</span>
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
                      ? "Add an optional comment for the health worker:"
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


        {activeTab === "editors" && adminType === "super_admin" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-2xl font-bold">Editor Management</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCreateEditorModal(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                >
                  <Icon name="add" size={20} />
                  Create Editor
                </button>
                <button
                  onClick={() => loadEditors()}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Create Editor Modal */}
            {createEditorModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Create New Editor</h3>
                    <button
                      onClick={() => {
                        setCreateEditorModal(false);
                        setNewEditor({ email: "", password: "", name: "" });
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Icon name="close" size={24} />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={newEditor.email}
                        onChange={(e) => setNewEditor({ ...newEditor, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="editor@example.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={newEditor.password}
                        onChange={(e) => setNewEditor({ ...newEditor, password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="Minimum 6 characters"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={newEditor.name}
                        onChange={(e) => setNewEditor({ ...newEditor, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="Editor name"
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={createEditor}
                        disabled={creatingEditor}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {creatingEditor ? "Creating..." : "Create Editor"}
                      </button>
                      <button
                        onClick={() => {
                          setCreateEditorModal(false);
                          setNewEditor({ email: "", password: "", name: "" });
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {editors.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No editors found.</p>
            ) : (
              <div className="grid gap-4">
                {editors.map((editor) => (
                  <div key={editor.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{editor.email}</h3>
                        {editor.name && (
                          <p className="text-sm text-slate-600 font-medium">{editor.name}</p>
                        )}
                        <p className="text-sm text-slate-500">
                          Last activity: {editor.lastActivity ? new Date(editor.lastActivity).toLocaleString() : "Never"}
                        </p>
                        <p className="text-sm text-slate-500">
                          Total activities: {editor.totalActivities}
                        </p>
                        {editor.isPaused && (
                          <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-700 rounded text-sm">
                            Paused
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={safeAsync(async () => {
                            const action = editor.isPaused ? "unpause" : "pause";
                            const res = await fetch("/api/admin/editors", {
                              method: "POST",
                              headers: { "Content-Type": "application/json", ...headers() },
                              body: JSON.stringify({ editorId: editor.id, action }),
                            });
                            if (res.ok) {
                              setPopup({
                                isOpen: true,
                                type: "success",
                                title: "Success",
                                message: `Editor ${action === "pause" ? "paused" : "unpaused"} successfully`,
                              });
                              loadEditors();
                            } else {
                              const data = await res.json();
                              setPopup({
                                isOpen: true,
                                type: "error",
                                title: "Error",
                                message: data.error || "Failed to update editor",
                              });
                            }
                          })}
                          className={`px-4 py-2 rounded-lg ${
                            editor.isPaused
                              ? "bg-green-500 hover:bg-green-600"
                              : "bg-yellow-500 hover:bg-yellow-600"
                          } text-white`}
                        >
                          {editor.isPaused ? "Unpause" : "Pause"}
                        </button>
                        <button
                          onClick={safeAsync(async () => {
                            if (!confirm(`Are you sure you want to delete editor ${editor.email}?`)) return;
                            const res = await fetch("/api/admin/editors", {
                              method: "POST",
                              headers: { "Content-Type": "application/json", ...headers() },
                              body: JSON.stringify({ editorId: editor.id, action: "delete" }),
                            });
                            if (res.ok) {
                              setPopup({
                                isOpen: true,
                                type: "success",
                                title: "Success",
                                message: "Editor deleted successfully",
                              });
                              loadEditors();
                            } else {
                              const data = await res.json();
                              setPopup({
                                isOpen: true,
                                type: "error",
                                title: "Error",
                                message: data.error || "Failed to delete editor",
                              });
                            }
                          })}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          Delete
                        </button>
                        <button
                          onClick={safeAsync(async () => {
                            // Check if editor is also a nurse/other health worker
                            try {
                              const res = await fetch(`/api/admin/doctor-details?email=${encodeURIComponent(editor.email)}`, {
                                headers: headers(),
                              });
                              if (res.ok) {
                                const data = await res.json();
                                if (data.doctor && data.doctor.role === "others") {
                                  setSelectedDoctor(data.doctor);
                                  setActiveTab("nurses");
                                } else {
                                  setSelectedEditor(editor);
                                  loadActivities(undefined, editor.id);
                                  setActiveTab("activity-logs");
                                }
                              } else {
                                setSelectedEditor(editor);
                                loadActivities(undefined, editor.id);
                                setActiveTab("activity-logs");
                              }
                            } catch {
                              setSelectedEditor(editor);
                              loadActivities(undefined, editor.id);
                              setActiveTab("activity-logs");
                            }
                          })}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          View {editors.find(e => e.id === editor.id) ? "Profile" : "Logs"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "activity-logs" && adminType === "super_admin" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-2xl font-bold">
                Activity Logs
                {selectedEditor && ` - ${selectedEditor.email}`}
              </h2>
              <div className="flex gap-2 flex-wrap">
                {selectedEditor && (
                  <button
                    onClick={() => {
                      setSelectedEditor(null);
                      loadActivities();
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Show All
                  </button>
                )}
                <button
                  onClick={() => {
                    loadActivities(undefined, selectedEditor?.id);
                  }}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                >
                  Refresh
                </button>
                <button
                  onClick={() => {
                    setActivityFilters({});
                    setSelectedEditor(null);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white rounded-lg shadow p-4 space-y-4">
              <h3 className="font-bold text-lg mb-3">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Admin Email Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Email
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by email..."
                    value={activityFilters.adminEmail || ""}
                    onChange={(e) => setActivityFilters({ ...activityFilters, adminEmail: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                {/* Admin Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Type
                  </label>
                  <select
                    value={activityFilters.adminType || "all"}
                    onChange={(e) => setActivityFilters({ ...activityFilters, adminType: e.target.value as any || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="all">All Types</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="editor">Editor</option>
                  </select>
                </div>

                {/* IP Address Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IP Address
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by IP..."
                    value={activityFilters.ipAddress || ""}
                    onChange={(e) => setActivityFilters({ ...activityFilters, ipAddress: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                {/* Target Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Type
                  </label>
                  <select
                    value={activityFilters.targetType || ""}
                    onChange={(e) => setActivityFilters({ ...activityFilters, targetType: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    <option value="doctor">Doctor</option>
                    <option value="mother">Mother</option>
                    <option value="question">Question</option>
                    <option value="report">Report</option>
                    <option value="editor">Editor</option>
                    <option value="system">System</option>
                  </select>
                </div>

                {/* Action Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by action..."
                    value={activityFilters.action || ""}
                    onChange={(e) => setActivityFilters({ ...activityFilters, action: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                {/* Start Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={activityFilters.startDate || ""}
                    onChange={(e) => setActivityFilters({ ...activityFilters, startDate: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                {/* End Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={activityFilters.endDate || ""}
                    onChange={(e) => setActivityFilters({ ...activityFilters, endDate: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Active Filters Summary */}
              {Object.keys(activityFilters).some(key => activityFilters[key as keyof typeof activityFilters]) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    Active Filters: {Object.values(activityFilters).filter(v => v).length} | 
                    Showing {activities.length} of {allActivities.length} activities
                  </p>
                </div>
              )}
            </div>
            
            {activities.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No activities found.</p>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {activities.map((activity) => (
                        <tr key={activity.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {new Date(activity.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              activity.adminType === "super_admin"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {activity.adminEmail}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-block px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                              {activity.targetType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs">
                              {activity.action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 font-mono text-xs">
                            {activity.targetId}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            <div className="max-w-md">
                              {Object.keys(activity.details || {}).length > 0 ? (
                                <details className="cursor-pointer">
                                  <summary className="text-blue-600 hover:text-blue-800 text-xs">
                                    View Details
                                  </summary>
                                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                    {Object.entries(activity.details).map(([key, value]) => (
                                      <div key={key} className="mb-1">
                                        <span className="font-semibold">{key}:</span>{" "}
                                        <span className="text-slate-700">
                                          {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              ) : (
                                <span className="text-slate-400 text-xs">No details</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 font-mono text-xs">
                            {activity.ipAddress || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab - Only for Super Admin */}
        {activeTab === "settings" && adminType === "super_admin" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">System Settings</h2>
            <p className="text-slate-600">Configure notification and question timing for all mothers.</p>
            
            {adminSettings ? (
              <div className="bg-white rounded-lg shadow p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Morning Recommendation Time
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Hour (0-23)</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={adminSettings.morningRecommendationHour}
                        onChange={(e) => setAdminSettings({
                          ...adminSettings,
                          morningRecommendationHour: parseInt(e.target.value) || 8,
                        })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Minute (0-59)</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={adminSettings.morningRecommendationMinute ?? 0}
                        onChange={(e) => setAdminSettings({
                          ...adminSettings,
                          morningRecommendationMinute: parseInt(e.target.value) || 0,
                        })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Current: {String(adminSettings.morningRecommendationHour).padStart(2, '0')}:{String(adminSettings.morningRecommendationMinute ?? 0).padStart(2, '0')} (Default: 08:00 / 8:00 AM)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Evening Recommendation Time
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Hour (0-23)</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={adminSettings.eveningRecommendationHour}
                        onChange={(e) => setAdminSettings({
                          ...adminSettings,
                          eveningRecommendationHour: parseInt(e.target.value) || 20,
                        })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Minute (0-59)</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={adminSettings.eveningRecommendationMinute ?? 0}
                        onChange={(e) => setAdminSettings({
                          ...adminSettings,
                          eveningRecommendationMinute: parseInt(e.target.value) || 0,
                        })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Current: {String(adminSettings.eveningRecommendationHour).padStart(2, '0')}:{String(adminSettings.eveningRecommendationMinute ?? 0).padStart(2, '0')} (Default: 20:00 / 8:00 PM)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Daily Questions Time
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Hour (0-23)</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={adminSettings.questionHour}
                        onChange={(e) => setAdminSettings({
                          ...adminSettings,
                          questionHour: parseInt(e.target.value) || 21,
                        })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Minute (0-59)</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={adminSettings.questionMinute ?? 0}
                        onChange={(e) => setAdminSettings({
                          ...adminSettings,
                          questionMinute: parseInt(e.target.value) || 0,
                        })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Current: {String(adminSettings.questionHour).padStart(2, '0')}:{String(adminSettings.questionMinute ?? 0).padStart(2, '0')} (Default: 21:00 / 9:00 PM)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Questions Per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={adminSettings.questionsPerDay}
                    onChange={(e) => setAdminSettings({
                      ...adminSettings,
                      questionsPerDay: parseInt(e.target.value) || 10,
                    })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Current: {adminSettings.questionsPerDay} questions per day (Default: 10)
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="block text-sm font-medium text-slate-700">
                        Enable Daily Questions
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        When enabled, daily 10 questions will show on mother dashboard. When disabled, questions will not appear.
                      </p>
                    </div>
                    <div className="ml-4">
                      <button
                        type="button"
                        onClick={() => setAdminSettings({
                          ...adminSettings,
                          dailyQuestionsEnabled: !adminSettings.dailyQuestionsEnabled,
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 ${
                          adminSettings.dailyQuestionsEnabled ? 'bg-pink-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            adminSettings.dailyQuestionsEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </label>
                  <p className="text-xs text-slate-500 mt-2">
                    Status: {adminSettings.dailyQuestionsEnabled ? (
                      <span className="text-green-600 font-medium">Enabled - Questions will show</span>
                    ) : (
                      <span className="text-red-600 font-medium">Disabled - Questions will not show</span>
                    )}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <button
                    onClick={saveAdminSettings}
                    disabled={savingSettings}
                    className="w-full sm:w-auto px-6 py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingSettings ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-slate-500">Loading settings...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
