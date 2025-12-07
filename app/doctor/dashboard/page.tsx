"use client";

import DashboardCard from "@/components/DashboardCard";
import Layout from "@/components/Layout";
import ListCard from "@/components/ListCard";
import DetailModal from "@/components/DetailModal";
import CommentSection from "@/components/CommentSection";
import MessagePopup from "@/components/MessagePopup";
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
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
  const [showPatientDetails, setShowPatientDetails] = useState<Record<string, boolean>>({});
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
      
      // Set up interval to check if account was paused
      const interval = setInterval(() => {
        checkDoctorStatus(t);
      }, 5 * 60 * 1000); // Check every 5 minutes
      
      return () => clearInterval(interval);
    }
  }, []);
  
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
      <div className="space-y-8">
        {/* Header - Redesigned */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-3">
              Doctor Dashboard
            </h1>
            <p className="text-lg text-neutral-600">
              Answer questions from mothers with care and expertise.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/doctor/profile" className="btn-secondary flex items-center gap-2">
              <Icon name="profile" size={20} />
              My Profile
            </Link>
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

        {/* Stats - Redesigned */}
        <div className="grid gap-6 md:grid-cols-3">
          <DashboardCard title={
            <span className="flex items-center gap-2">
              <Icon name="question" size={20} />
              Total Questions
            </span>
          }>
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {questions.length}
            </div>
          </DashboardCard>
          <DashboardCard title={
            <span className="flex items-center gap-2">
              <Icon name="pending" size={20} />
              Pending
            </span>
          }>
            <div className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              {unansweredQuestions.length}
            </div>
          </DashboardCard>
          <DashboardCard title={
            <span className="flex items-center gap-2">
              <Icon name="success" size={20} />
              Answered
            </span>
          }>
            <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {answeredQuestions.length}
            </div>
          </DashboardCard>
        </div>

        {/* Unanswered Questions - Redesigned */}
        {unansweredQuestions.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-neutral-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Icon name="pending" size={24} className="text-white" />
              </div>
              Pending Questions ({unansweredQuestions.length})
            </h2>
            <div className="space-y-3">
              {unansweredQuestions.map((q) => (
                <ListCard
                  key={q.id}
                  title={q.mother?.name || q.mother?.email || "Mother"}
                  subtitle={q.question.length > 100 ? q.question.substring(0, 100) + "..." : q.question}
                  badge={
                    <div className="flex items-center gap-2">
                      {q.hasNewActivity && (
                        <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                      )}
                      <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>
                    </div>
                  }
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
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(q.createdAt).toLocaleDateString()}
                  </p>
                </ListCard>
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

        {/* Answered Questions - Redesigned */}
        {answeredQuestions.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-neutral-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                <Icon name="success" size={24} className="text-white" />
              </div>
              Answered Questions ({answeredQuestions.length})
            </h2>
            <div className="space-y-3">
              {answeredQuestions.map((q) => (
                <ListCard
                  key={q.id}
                  title={q.mother?.name || q.mother?.email || "Mother"}
                  subtitle={q.question.length > 100 ? q.question.substring(0, 100) + "..." : q.question}
                  badge={
                    <div className="flex items-center gap-2">
                      {q.hasNewActivity && (
                        <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                      )}
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Answered</span>
                    </div>
                  }
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
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(q.createdAt).toLocaleDateString()}
                  </p>
                </ListCard>
              ))}
            </div>
          </div>
        )}

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
                  <p className="text-xs text-neutral-500 mt-3 flex items-center gap-1">
                    <Icon name="calendar" size={14} />
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
        {questions.length === 0 && (
          <div className="text-center py-16">
            <div className="mb-6 flex justify-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center shadow-lg">
                <Icon name="doctor" size={64} className="text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-neutral-800 mb-3">No questions yet</h3>
            <p className="text-lg text-neutral-600">Questions from mothers will appear here</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
