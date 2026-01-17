"use client";

import DashboardCard from "@/components/DashboardCard";
import Layout from "@/components/Layout";
import ListCard from "@/components/ListCard";
import MessagePopup from "@/components/MessagePopup";
import MobileDashboardMenu from "@/components/MobileDashboardMenu";
import Icon from "@/components/Icon";
import TimeSlotManagement from "@/components/TimeSlotManagement";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DoctorDashboard() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<string | null>(null);
  const [consultationMessages, setConsultationMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [patientDetails, setPatientDetails] = useState<any>(null);
  const [patientDetailsLoading, setPatientDetailsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [popup, setPopup] = useState<{ isOpen: boolean; type: "success" | "error" | "warning" | "info"; title: string; message: string }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  useEffect(() => {
    // Check for OAuth token in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const oauthToken = urlParams.get('token');
    const isOAuth = urlParams.get('oauth') === 'true';
    
    if (oauthToken && isOAuth) {
      // OAuth login - save token and clean URL
      localStorage.setItem("doctorToken", oauthToken);
      setToken(oauthToken);
      // Clean URL
      window.history.replaceState({}, '', '/doctor/dashboard');
    } else {
      // Regular token check
      const t = localStorage.getItem("doctorToken") || "";
      setToken(t);
      if (!t) return;
    }
    
    const t = oauthToken || localStorage.getItem("doctorToken") || "";
    if (t) {
      // Get doctor ID from token
      try {
        const payload = JSON.parse(atob(t.split('.')[1]));
        setDoctorId(payload.id || "");
      } catch {
        // Will be set when profile loads
      }
      loadProfile(t);
      loadConsultations(t);
      checkDoctorStatus(t);
      
      // Set up real-time updates
      
      // Frequent updates (every 30 seconds) - for new consultations
      const frequentInterval = setInterval(() => {
        loadConsultations(t); // Check for new consultations
      }, 30 * 1000); // Every 30 seconds
      
      // Less frequent updates (every 5 minutes) - for account status
      const slowInterval = setInterval(() => {
        checkDoctorStatus(t); // Check if account was paused
      }, 5 * 60 * 1000); // Every 5 minutes
      
      return () => {
        clearInterval(frequentInterval);
        clearInterval(slowInterval);
      };
    }
  }, []);
  
  // Redirect to dashboard if logged in and on home page
  useEffect(() => {
    if (token && typeof window !== "undefined" && window.location.pathname === "/") {
      window.location.href = "/doctor/dashboard";
    }
  }, [token]);

  const headers = (t = token) => (t ? { Authorization: `Bearer ${t}` } : undefined);

  const loadProfile = async (t = token) => {
    try {
      const res = await fetch("/api/doctor/profile", { headers: headers(t) });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  };

  const loadConsultations = async (t = token) => {
    try {
      const res = await fetch("/api/doctor/consultations", { headers: headers(t) });
      if (res.ok) {
        const data = await res.json();
        setConsultations(data.consultations || []);
      }
    } catch (err) {
      console.error("Failed to load consultations:", err);
    }
  };

  const approveConsultation = async (consultationId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/doctor/consultations/${consultationId}/approve`, {
        method: "POST",
        headers: headers(),
      });
      if (res.ok) {
        setMessage("✅ Consultation approved successfully!");
        loadConsultations();
      } else {
        const data = await res.json();
        setMessage(`❌ ${data.error || "Failed to approve consultation"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const rejectConsultation = async (consultationId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/doctor/consultations/${consultationId}/reject`, {
        method: "POST",
        headers: headers(),
      });
      if (res.ok) {
        setMessage("✅ Consultation rejected");
        loadConsultations();
      } else {
        const data = await res.json();
        setMessage(`❌ ${data.error || "Failed to reject consultation"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadPatientDetails = async (consultationId: string) => {
    setPatientDetailsLoading(true);
    try {
      const res = await fetch(`/api/doctor/consultations/${consultationId}/patient`, {
        headers: headers(),
      });
      if (res.ok) {
        const data = await res.json();
        setPatientDetails(data);
      }
    } catch (err) {
      console.error("Failed to load patient details:", err);
    } finally {
      setPatientDetailsLoading(false);
    }
  };

  const openConsultationChat = async (consultationId: string) => {
    setSelectedConsultation(consultationId);
    await loadConsultationMessages(consultationId);
  };

  const loadConsultationMessages = async (consultationId: string) => {
    try {
      const res = await fetch(`/api/consultations/${consultationId}/messages`, {
        headers: headers(),
      });
      if (res.ok) {
        const data = await res.json();
        setConsultationMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const sendConsultationMessage = async () => {
    if (!selectedConsultation || !newMessage.trim()) return;
    try {
      const res = await fetch(`/api/consultations/${selectedConsultation}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers(),
        },
        body: JSON.stringify({ message: newMessage.trim() }),
      });
      if (res.ok) {
        setNewMessage("");
        await loadConsultationMessages(selectedConsultation);
      } else {
        const data = await res.json();
        setMessage(`❌ ${data.error || "Failed to send message"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    }
  };

  const removeConsultation = async (consultationId: string) => {
    if (!confirm("Are you sure you want to remove this patient consultation? This will delete all messages and data.")) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/consultations/${consultationId}`, {
        method: "DELETE",
        headers: headers(),
      });
      
      if (res.ok) {
        setMessage("✅ Consultation removed successfully");
        loadConsultations();
      } else {
        const data = await res.json();
        setMessage(`❌ ${data.error || "Failed to remove consultation"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const checkDoctorStatus = async (t = token) => {
    try {
      const res = await fetch("/api/doctor/profile", { headers: headers(t) });
      if (res.ok) {
        const data = await res.json();
        // Check if account is paused and auto-logout
        if (data.profile?.status === "paused") {
          setPopup({
            isOpen: true,
            type: "error",
            title: "Account Paused",
            message: "Your account has been paused by admin. You will be logged out automatically.",
          });
          setTimeout(() => {
            localStorage.removeItem("doctorToken");
            router.push("/");
          }, 3000);
        }
      } else if (res.status === 401) {
        // Token invalid or account paused - logout
        localStorage.removeItem("doctorToken");
        router.push("/");
      }
    } catch (err) {
      console.error("Failed to check doctor status:", err);
    }
  };


  if (!token) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-3xl font-bold mb-4">Doctor Dashboard</h1>
          <p className="text-slate-600 mb-6">Please log in to continue.</p>
          <Link href="/doctor/login" className="btn-primary inline-block">
            Login
          </Link>
        </div>
      </Layout>
    );
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "overview", action: "navigate" as const, href: "/doctor/dashboard" },
    { id: "profile", label: "My Profile", icon: "profile", action: "navigate" as const, href: "/doctor/profile" },
    { id: "logout", label: "Logout", action: "logout" as const },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Mobile Menu */}
        <MobileDashboardMenu tabs={tabs} activeTab="dashboard" onTabChange={(id) => {
          if (id === "dashboard") {
            router.push("/doctor/dashboard");
          } else if (id === "profile") {
            router.push("/doctor/profile");
          }
        }} />
        
        {/* Hero Section - Redesigned */}
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-10 md:p-12 mb-8 shadow-2xl relative overflow-hidden no-select">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full blur-2xl -ml-10 -mb-10"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-widest mb-4">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                Professional Portal
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black !text-white mb-3 tracking-tight">
              Doctor Dashboard
            </h1>
              <p className="text-blue-100 text-lg font-medium opacity-90 max-w-md leading-relaxed">
              Manage consultations and provide care to your patients.
            </p>
          </div>
            
            <div className="flex flex-shrink-0 relative">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white/15 backdrop-blur-md border-2 border-white/30 flex items-center justify-center shadow-xl group hover:bg-white/20 transition-all duration-500">
                <Icon name="doctor" size={64} className="text-white brightness-0 invert opacity-90 group-hover:scale-110 transition-transform" />
              </div>
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

        {/* Reference Number Display */}
        {profile?.referenceNumber && (
          <DashboardCard title={
            <span className="flex items-center gap-2">
              <Icon name="profile" size={20} />
              Your Reference Number
            </span>
          }>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {profile.referenceNumber}
              </div>
              <p className="text-sm text-slate-600">Share this number with patients to request consultations</p>
            </div>
          </DashboardCard>
        )}

        {/* Stats - Redesigned */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
          <DashboardCard title={
            <span className="flex items-center gap-2">
              <Icon name="doctor" size={20} />
              Total Consultations
            </span>
          }>
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {consultations.length}
            </div>
          </DashboardCard>
          <DashboardCard title={
            <span className="flex items-center gap-2">
              <Icon name="pending" size={20} />
              Pending Requests
            </span>
          }>
            <div className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              {consultations.filter(c => c.status === "pending").length}
            </div>
          </DashboardCard>
        </div>

        {/* Time Slot & Booking Management */}
        <TimeSlotManagement token={token} />

        {/* Consultations Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-neutral-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Icon name="doctor" size={24} className="text-white" />
            </div>
            Consultations ({consultations.length})
          </h2>
          
          {consultations.length === 0 ? (
            <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
              <Icon name="doctor" size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="text-lg font-medium text-slate-600 mb-2">No consultations yet</p>
              <p className="text-sm text-slate-500">Mothers can request consultations using your reference number</p>
            </div>
          ) : (
            <div className="space-y-3">
              {consultations.map((consultation) => (
                <ListCard
                  key={consultation.id}
                  title={consultation.mother?.name || consultation.mother?.email || "Patient"}
                  subtitle={`Reference: ${consultation.doctorReferenceNumber || (consultation as any).doctorBmdcNumber} • Requested on ${new Date(consultation.requestedAt).toLocaleDateString()}`}
                  badge={
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      consultation.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : consultation.status === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {consultation.status === "approved" ? "Approved" : consultation.status === "pending" ? "Pending" : "Rejected"}
                    </span>
                  }
                  onClick={() => {
                    if (consultation.status === "approved") {
                      openConsultationChat(consultation.id);
                      loadPatientDetails(consultation.id);
                    }
                  }}
                >
                  <div className="flex gap-2 mt-2">
                    {consultation.status === "pending" && (
                      <>
                        <button
                          className="btn-primary text-xs px-3 py-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            approveConsultation(consultation.id);
                          }}
                          disabled={loading}
                        >
                          Approve
                        </button>
                        <button
                          className="btn-secondary text-xs px-3 py-1 bg-red-50 text-red-600 border-red-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to reject this consultation request?")) {
                              rejectConsultation(consultation.id);
                            }
                          }}
                          disabled={loading}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {consultation.status === "approved" && (
                      <button
                        className="btn-primary text-xs px-3 py-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          openConsultationChat(consultation.id);
                          loadPatientDetails(consultation.id);
                        }}
                      >
                        View Patient & Chat
                      </button>
                    )}
                    <button
                      className="btn-secondary text-xs px-3 py-1 bg-red-50 text-red-600 border-red-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeConsultation(consultation.id);
                      }}
                      disabled={loading}
                    >
                      <span className="flex items-center gap-1">
                        <Icon name="delete" size={14} />
                        Remove
                      </span>
                    </button>
                  </div>
                </ListCard>
              ))}
            </div>
          )}
        </div>

        {/* Consultation Chat & Patient Details Modal */}
        {selectedConsultation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-lg sm:rounded-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-4 sm:p-6 border-b">
                <h2 className="text-xl sm:text-2xl font-bold">Patient Consultation</h2>
                <button
                  onClick={() => {
                    setSelectedConsultation(null);
                    setConsultationMessages([]);
                    setNewMessage("");
                    setPatientDetails(null);
                  }}
                  className="text-slate-500 hover:text-slate-700 p-2"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Patient Details */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Icon name="profile" size={20} />
                      Patient Details
                    </h3>
                    {patientDetails ? (
                      <div className="space-y-4">
                        <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                          <div className="grid gap-2 text-sm">
                            <div><span className="font-medium">Name:</span> {patientDetails.patient.name || "N/A"}</div>
                            <div><span className="font-medium">Age:</span> {patientDetails.patient.age || "N/A"}</div>
                            <div><span className="font-medium">Phone:</span> {patientDetails.patient.phone || "N/A"}</div>
                            <div><span className="font-medium">Email:</span> {patientDetails.patient.email || "N/A"}</div>
                            <div><span className="font-medium">Blood Group:</span> {patientDetails.patient.bloodGroup || "N/A"}</div>
                            <div><span className="font-medium">Pregnancy Status:</span> {patientDetails.patient.pregnancyStatus || "N/A"}</div>
                            {patientDetails.patient.daysPregnant && (
                              <div><span className="font-medium">Days Pregnant:</span> {patientDetails.patient.daysPregnant}</div>
                            )}
                            <div><span className="font-medium">Previous Pregnancies:</span> {patientDetails.patient.previousPregnancies || "N/A"}</div>
                            <div><span className="font-medium">Conditions:</span> {patientDetails.patient.conditions || "None"}</div>
                            <div><span className="font-medium">Medications:</span> {patientDetails.patient.medications || "None"}</div>
                            <div><span className="font-medium">Allergies:</span> {patientDetails.patient.allergies || "None"}</div>
                          </div>
                        </div>
                        {patientDetails.prescriptions && patientDetails.prescriptions.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <Icon name="prescription" size={18} />
                              Prescriptions ({patientDetails.prescriptions.length})
                            </h4>
                            <div className="space-y-2">
                              {patientDetails.prescriptions.map((p: any) => (
                                <a
                                  key={p.key}
                                  href={p.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                                >
                                  <Icon name="prescription" size={16} className="inline mr-2" />
                                  {p.fileName}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Icon name="sync" size={24} className="animate-spin mx-auto mb-2" />
                        <p>Loading patient details...</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Chat */}
                  <div className="flex flex-col">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Icon name="chat" size={20} />
                      Messages
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[300px] max-h-[400px] border border-slate-200 rounded-lg p-4 bg-slate-50">
                      {consultationMessages.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      ) : (
                        consultationMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.senderRole === "doctor" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                msg.senderRole === "doctor"
                                  ? "bg-blue-500 text-white"
                                  : "bg-white text-slate-800 border border-slate-200"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                              <p className={`text-xs mt-1 ${
                                msg.senderRole === "doctor" ? "text-blue-100" : "text-slate-500"
                              }`}>
                                {new Date(msg.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <textarea
                        className="input flex-1 min-h-[60px]"
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendConsultationMessage();
                          }
                        }}
                      />
                      <button
                        className="btn-primary whitespace-nowrap min-h-[60px]"
                        onClick={sendConsultationMessage}
                        disabled={!newMessage.trim()}
                      >
                        <Icon name="submit" size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
