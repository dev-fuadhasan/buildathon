"use client";

import DashboardCard from "@/components/DashboardCard";
import Layout from "@/components/Layout";
import ListCard from "@/components/ListCard";
import DetailModal from "@/components/DetailModal";
import CommentSection from "@/components/CommentSection";
import MessagePopup from "@/components/MessagePopup";
import MobileDashboardMenu from "@/components/MobileDashboardMenu";
import Icon from "@/components/Icon";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Comment = {
  id: string;
  authorId: string;
  authorRole: "doctor" | "mother";
  content: string;
  createdAt: string;
  replies?: Comment[];
};

type QuestionItem = {
  id: string;
  question: string;
  answer?: string;
  createdAt: string;
  answeredAt?: string;
  motherId: string;
  comments?: Comment[];
  hasNewActivity?: boolean;
  lastSeenByDoctor?: string;
  mother?: {
    name?: string;
    email: string;
    age?: number;
    phone?: string;
    address?: string;
    bloodGroup?: string;
    weeksPregnant?: number;
    daysPregnant?: number;
    conditions?: string;
    medications?: string;
    allergies?: string;
    previousPregnancies?: number;
    emergencyContact?: string;
    emergencyPhone?: string;
  };
  prescriptions?: { key: string; url: string }[];
};

export default function DoctorDashboard() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
  const [showPatientDetails, setShowPatientDetails] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "answered">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
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
      // Get doctor ID from token
      try {
        const payload = JSON.parse(atob(t.split('.')[1]));
        setDoctorId(payload.id || "");
      } catch {
        // Will be set when questions load
      }
      loadQuestions(t);
      checkDoctorStatus(t);
      loadDoctorProfile(t);
      
      // Set up real-time updates
      
      // Frequent updates (every 30 seconds) - for new questions
      const frequentInterval = setInterval(() => {
        loadQuestions(t); // Check for new questions
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

  const loadDoctorProfile = async (t = token) => {
    try {
      const res = await fetch("/api/doctor/profile", { headers: headers(t) });
      if (res.ok) {
        const data = await res.json();
        setDoctorName(data.profile?.name || "Doctor");
      }
    } catch (err) {
      console.error("Failed to load doctor profile:", err);
    }
  };
  
  // Redirect to dashboard if logged in and on home page
  useEffect(() => {
    if (token && typeof window !== "undefined" && window.location.pathname === "/") {
      window.location.href = "/doctor/dashboard";
    }
  }, [token]);

  const headers = (t = token) => (t ? { Authorization: `Bearer ${t}` } : undefined);

  const loadQuestions = async (t = token) => {
    try {
      const res = await fetch("/api/doctor/questions", { headers: headers(t) });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      } else if (res.status === 401) {
        // Token invalid or account paused - logout
        localStorage.removeItem("doctorToken");
        router.push("/");
      }
    } catch (err) {
      console.error("Failed to load questions:", err);
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

  const submitAnswer = async (questionId: string) => {
    const answer = answerTexts[questionId]?.trim();
    if (!answer) {
      setMessage("Please enter an answer before submitting");
      return;
    }
    
    setLoading(true);
    setMessage("");
    
    try {
      const res = await fetch("/api/doctor/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({ questionId, answer }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Answer submitted successfully!");
        setAnswerTexts({ ...answerTexts, [questionId]: "" });
        setSelectedQuestion(null);
        loadQuestions();
      } else {
        setMessage(`❌ ${data.error || "Could not submit answer"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const unansweredQuestions = questions.filter((q) => !q.answer);
  const answeredQuestions = questions.filter((q) => q.answer);

  // Filter and sort questions
  const getFilteredAndSortedQuestions = () => {
    let filtered = questions;
    
    if (filter === "pending") {
      filtered = unansweredQuestions;
    } else if (filter === "answered") {
      filtered = answeredQuestions;
    }
    
    // Sort by date
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });
    
    return sorted;
  };

  const displayedQuestions = getFilteredAndSortedQuestions();

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

  return (
    <Layout>
      <div className="space-y-0">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 pt-8 pb-12 mb-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px'
            }}></div>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-900 mb-2">
              Welcome Dr. {doctorName || "Doctor"}
            </h1>
            <p className="text-lg sm:text-xl text-neutral-700 font-medium">
              You have <span className="font-bold text-orange-600">{unansweredQuestions.length}</span> pending {unansweredQuestions.length === 1 ? 'question' : 'questions'}
            </p>
          </div>
        </section>

        <div className="space-y-8 mt-8">

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

        {/* Stats - Enhanced with Better Visual Hierarchy */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
          <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <Icon name="question" size={24} className="text-white" />
              </div>
              <h3 className="text-base font-semibold text-neutral-700">Total Questions</h3>
            </div>
            <div className="text-5xl sm:text-6xl font-extrabold text-blue-600">
              {questions.length}
            </div>
          </div>
          <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-lg">
                <Icon name="pending" size={24} className="text-white" />
              </div>
              <h3 className="text-base font-semibold text-neutral-700">Pending</h3>
            </div>
            <div className="text-5xl sm:text-6xl font-extrabold text-orange-600">
              {unansweredQuestions.length}
            </div>
          </div>
          <div className="rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                <Icon name="success" size={24} className="text-white" />
              </div>
              <h3 className="text-base font-semibold text-neutral-700">Answered</h3>
            </div>
            <div className="text-5xl sm:text-6xl font-extrabold text-green-600">
              {answeredQuestions.length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                filter === "all"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                filter === "pending"
                  ? "bg-orange-600 text-white shadow-md"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter("answered")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                filter === "answered"
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              Answered
            </button>
          </div>
          <div className="flex flex-wrap gap-2 ml-auto">
            <button
              onClick={() => setSortBy("newest")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                sortBy === "newest"
                  ? "bg-neutral-800 text-white shadow-md"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              Newest
            </button>
            <button
              onClick={() => setSortBy("oldest")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                sortBy === "oldest"
                  ? "bg-neutral-800 text-white shadow-md"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              Oldest
            </button>
          </div>
        </div>

        {/* Questions List - Redesigned */}
        {displayedQuestions.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-neutral-800 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                filter === "pending" ? "from-yellow-500 to-orange-500" :
                filter === "answered" ? "from-green-500 to-emerald-500" :
                "from-blue-500 to-cyan-500"
              } flex items-center justify-center shadow-lg`}>
                <Icon name={filter === "pending" ? "pending" : filter === "answered" ? "success" : "question"} size={24} className="text-white" />
              </div>
              {filter === "pending" ? "Pending" : filter === "answered" ? "Answered" : "All"} Questions ({displayedQuestions.length})
            </h2>
            <div className="space-y-3">
              {displayedQuestions.map((q) => (
                <div
                  key={q.id}
                  className="rounded-xl border-2 border-neutral-200 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer hover:border-pink-300 hover:scale-[1.01]"
                  onClick={() => {
                    setSelectedQuestion(q);
                    // Mark as seen
                    if (q.hasNewActivity) {
                      fetch(`/api/doctor/questions/${q.id}/mark-seen`, {
                        method: "POST",
                        headers: headers(),
                      }).then(() => loadQuestions());
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center flex-shrink-0 shadow-md">
                      <Icon name="mom" size={24} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-neutral-900 mb-1">
                            {q.mother?.name || q.mother?.email || "Mother"}
                          </h4>
                          <p className="font-semibold text-neutral-800 text-base leading-relaxed mb-2">
                            {q.question.length > 150 ? q.question.substring(0, 150) + "..." : q.question}
                          </p>
                          <p className="text-xs text-neutral-500">
                            Asked on {new Date(q.createdAt).toLocaleDateString("en-US", { 
                              year: "numeric", 
                              month: "long", 
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {q.hasNewActivity && (
                            <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                          )}
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            q.answer 
                              ? "bg-green-100 text-green-700" 
                              : "bg-orange-100 text-orange-700"
                          }`}>
                            {q.answer ? "Answered" : "Pending"}
                          </span>
                        </div>
                      </div>
                      {q.answer && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQuestion(q);
                          }}
                          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-semibold"
                        >
                          View Full Conversation
                          <Icon name="view" size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question Detail Modal */}
        <DetailModal
          isOpen={!!selectedQuestion && !selectedQuestion.answer}
          onClose={() => setSelectedQuestion(null)}
          title={`Question from ${selectedQuestion?.mother?.name || selectedQuestion?.mother?.email || "Mother"}`}
        >
          {selectedQuestion && !selectedQuestion.answer && (
            <div className="space-y-6">
              {/* Question - Redesigned */}
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 p-5 border-2 border-blue-200 shadow-sm">
                <p className="font-semibold text-neutral-800 mb-3 flex items-center gap-2">
                  <Icon name="question" size={20} />
                  Question:
                </p>
                <p className="text-neutral-700 text-base leading-relaxed">{selectedQuestion.question}</p>
                <p className="text-xs text-neutral-500 mt-3">
                  Asked on {new Date(selectedQuestion.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Patient Details - Always Visible */}
              {selectedQuestion.mother && (
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Icon name="profile" size={20} />
                    Complete Patient Information
                  </h4>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-3 md:grid-cols-2 text-sm">
                        <div>
                          <span className="font-medium text-slate-600">Name:</span>
                          <span className="ml-2 text-slate-800">{selectedQuestion.mother.name || "N/A"}</span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600">Email:</span>
                          <span className="ml-2 text-slate-800">{selectedQuestion.mother.email}</span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600">Age:</span>
                          <span className="ml-2 text-slate-800">{selectedQuestion.mother.age || "N/A"}</span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600">Phone:</span>
                          <span className="ml-2 text-slate-800">{selectedQuestion.mother.phone || "N/A"}</span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600">Pregnancy Progress:</span>
                          <span className="ml-2 text-slate-800">
                            {(() => {
                              const days = selectedQuestion.mother.daysPregnant || (selectedQuestion.mother.weeksPregnant ? selectedQuestion.mother.weeksPregnant * 7 : undefined);
                              if (!days) return "N/A";
                              const weeks = Math.floor(days / 7);
                              const months = Math.floor(days / 30);
                              return `${days} days (${weeks} weeks, ${months} months)`;
                            })()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600">Blood Group:</span>
                          <span className="ml-2 text-slate-800">{selectedQuestion.mother.bloodGroup || "N/A"}</span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600">Previous Pregnancies:</span>
                          <span className="ml-2 text-slate-800">{selectedQuestion.mother.previousPregnancies || "N/A"}</span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-medium text-slate-600">Address:</span>
                          <span className="ml-2 text-slate-800">{selectedQuestion.mother.address || "N/A"}</span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-medium text-slate-600">Medical Conditions:</span>
                          <span className="ml-2 text-slate-800">
                            {selectedQuestion.mother.conditions || "None reported"}
                          </span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-medium text-slate-600">Medications:</span>
                          <span className="ml-2 text-slate-800">
                            {selectedQuestion.mother.medications || "None reported"}
                          </span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-medium text-slate-600">Allergies:</span>
                          <span className="ml-2 text-slate-800">
                            {selectedQuestion.mother.allergies || "None reported"}
                          </span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-medium text-slate-600">Emergency Contact:</span>
                          <span className="ml-2 text-slate-800">
                            {selectedQuestion.mother.emergencyContact || "N/A"}
                          </span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-medium text-slate-600">Emergency Phone:</span>
                          <span className="ml-2 text-slate-800">
                            {selectedQuestion.mother.emergencyPhone || "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Prescriptions */}
                      {selectedQuestion.prescriptions && selectedQuestion.prescriptions.length > 0 && (
                        <div className="mt-4">
                          <p className="font-medium text-slate-600 mb-2 flex items-center gap-2">
                            <Icon name="prescription" size={18} />
                            Prescriptions ({selectedQuestion.prescriptions.length}):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedQuestion.prescriptions.map((p) => {
                              const fileName = p.key.split("/").pop() || "prescription";
                              return (
                                <a
                                  key={p.key}
                                  href={p.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors"
                                >
                                  <Icon name="prescription" size={16} />
                                  {fileName}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                </div>
              )}

              {/* Answer Form - Redesigned */}
              <div className="rounded-xl border-2 border-neutral-200 bg-white p-6 shadow-sm">
                <label className="block text-base font-semibold text-neutral-800 mb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <Icon name="chat" size={18} className="text-white" />
                  </div>
                  Your Answer:
                </label>
                <textarea
                  className="input w-full h-32"
                  placeholder="Provide a clear, supportive, and professional answer..."
                  value={answerTexts[selectedQuestion.id] || ""}
                  onChange={(e) =>
                    setAnswerTexts({ ...answerTexts, [selectedQuestion.id]: e.target.value })
                  }
                  disabled={loading}
                />
                <div className="flex justify-end mt-3">
                  <button
                    className="btn-primary"
                    onClick={() => {
                      submitAnswer(selectedQuestion.id);
                      setSelectedQuestion(null);
                    }}
                    disabled={loading || !answerTexts[selectedQuestion.id]?.trim()}
                  >
                    {loading ? "Submitting..." : (
                      <span className="flex items-center gap-2">
                        <Icon name="submit" size={18} />
                        Submit Answer
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Comments Section */}
              {selectedQuestion && doctorId && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                  <CommentSection
                    questionId={selectedQuestion.id}
                    userRole="doctor"
                    userId={doctorId}
                    token={token}
                    comments={selectedQuestion.comments}
                    onCommentAdded={() => {
                      loadQuestions();
                      // Reload selected question to get updated comments
                      const updated = questions.find(q => q.id === selectedQuestion.id);
                      if (updated) setSelectedQuestion(updated);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </DetailModal>


        {/* Answered Question Detail Modal */}
        <DetailModal
          isOpen={!!selectedQuestion && !!selectedQuestion.answer}
          onClose={() => setSelectedQuestion(null)}
          title={`Question from ${selectedQuestion?.mother?.name || selectedQuestion?.mother?.email || "Mother"}`}
        >
          {selectedQuestion && selectedQuestion.answer && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 p-5 border-2 border-blue-200 shadow-sm">
                <p className="font-semibold text-neutral-800 mb-2 flex items-center gap-2">
                  <Icon name="question" size={20} />
                  Question:
                </p>
                <p className="text-base text-neutral-700 leading-relaxed">{selectedQuestion.question}</p>
                <p className="text-xs text-neutral-500 mt-3">
                  Asked on {new Date(selectedQuestion.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 p-5 border-2 border-green-200 shadow-sm">
                <p className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <Icon name="success" size={20} />
                  Your Answer:
                </p>
                <p className="text-base text-neutral-700 leading-relaxed">{selectedQuestion.answer}</p>
                {selectedQuestion.answeredAt && (
                  <p className="text-xs text-neutral-500 mt-3">
                    Answered on {new Date(selectedQuestion.answeredAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Patient Details - Redesigned */}
              {selectedQuestion.mother && (
                <div className="rounded-xl border-2 border-neutral-200 bg-white p-6 shadow-sm">
                  <h4 className="font-bold text-xl text-neutral-800 mb-5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                      <Icon name="profile" size={20} className="text-white" />
                    </div>
                    Complete Patient Information
                  </h4>
                  <div className="rounded-xl border-2 border-neutral-200 bg-gradient-to-br from-neutral-50 to-white p-5">
                    <div className="grid gap-3 md:grid-cols-2 text-sm">
                      <div>
                        <span className="font-medium text-neutral-600">Name:</span>
                        <span className="ml-2 text-neutral-800">{selectedQuestion.mother.name || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-medium text-neutral-600">Email:</span>
                        <span className="ml-2 text-neutral-800">{selectedQuestion.mother.email}</span>
                      </div>
                      <div>
                        <span className="font-medium text-neutral-600">Age:</span>
                        <span className="ml-2 text-neutral-800">{selectedQuestion.mother.age || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-medium text-neutral-600">Phone:</span>
                        <span className="ml-2 text-neutral-800">{selectedQuestion.mother.phone || "N/A"}</span>
                      </div>
                      {(() => {
                        const days = selectedQuestion.mother.daysPregnant || (selectedQuestion.mother.weeksPregnant ? selectedQuestion.mother.weeksPregnant * 7 : undefined);
                        if (days) {
                          const weeks = Math.floor(days / 7);
                          const months = Math.floor(days / 30);
                          return (
                            <div>
                              <span className="font-medium text-neutral-600">Pregnancy Progress:</span>
                              <span className="ml-2 text-neutral-800">
                                {days} days ({weeks} weeks, {months} months)
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      <div>
                        <span className="font-medium text-neutral-600">Blood Group:</span>
                        <span className="ml-2 text-neutral-800">{selectedQuestion.mother.bloodGroup || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-medium text-neutral-600">Previous Pregnancies:</span>
                        <span className="ml-2 text-neutral-800">{selectedQuestion.mother.previousPregnancies || "N/A"}</span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-medium text-neutral-600">Address:</span>
                        <span className="ml-2 text-neutral-800">{selectedQuestion.mother.address || "N/A"}</span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-medium text-neutral-600">Medical Conditions:</span>
                        <span className="ml-2 text-neutral-800">
                          {selectedQuestion.mother.conditions || "None reported"}
                        </span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-medium text-neutral-600">Medications:</span>
                        <span className="ml-2 text-neutral-800">
                          {selectedQuestion.mother.medications || "None reported"}
                        </span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-medium text-neutral-600">Allergies:</span>
                        <span className="ml-2 text-neutral-800">
                          {selectedQuestion.mother.allergies || "None reported"}
                        </span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-medium text-neutral-600">Emergency Contact:</span>
                        <span className="ml-2 text-neutral-800">
                          {selectedQuestion.mother.emergencyContact || "N/A"}
                        </span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-medium text-neutral-600">Emergency Phone:</span>
                        <span className="ml-2 text-neutral-800">
                          {selectedQuestion.mother.emergencyPhone || "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Prescriptions */}
                    {selectedQuestion.prescriptions && selectedQuestion.prescriptions.length > 0 && (
                      <div className="mt-4">
                        <p className="font-medium text-neutral-600 mb-2 flex items-center gap-2">
                          <Icon name="prescription" size={18} />
                          Prescriptions ({selectedQuestion.prescriptions.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedQuestion.prescriptions.map((p) => {
                            const fileName = p.key.split("/").pop() || "prescription";
                            return (
                              <a
                                key={p.key}
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg bg-white border-2 border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 transition-colors shadow-sm"
                              >
                                <Icon name="prescription" size={16} />
                                {fileName}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Comments Section for Answered Questions */}
              {selectedQuestion && doctorId && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                  <CommentSection
                    questionId={selectedQuestion.id}
                    userRole="doctor"
                    userId={doctorId}
                    token={token}
                    comments={selectedQuestion.comments}
                    onCommentAdded={() => {
                      loadQuestions();
                      const updated = questions.find(q => q.id === selectedQuestion.id);
                      if (updated) setSelectedQuestion(updated);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </DetailModal>

        {/* Empty State - Redesigned */}
        {displayedQuestions.length === 0 && (
          <div className="text-center py-16 rounded-xl border-2 border-neutral-200 bg-neutral-50">
            <div className="mb-6 flex justify-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center shadow-lg">
                <Icon name="doctor" size={64} className="text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-neutral-800 mb-3">
              {filter === "all" ? "No questions yet" : filter === "pending" ? "No pending questions" : "No answered questions"}
            </h3>
            <p className="text-lg text-neutral-600">
              {filter === "all" ? "Questions from mothers will appear here" : "Try changing the filter to see more questions"}
            </p>
          </div>
        )}
        </div>
      </div>
    </Layout>
  );
}
