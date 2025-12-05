"use client";

import DashboardCard from "@/components/DashboardCard";
import Layout from "@/components/Layout";
import ListCard from "@/components/ListCard";
import DetailModal from "@/components/DetailModal";
import { useEffect, useState } from "react";
import Link from "next/link";

type QuestionItem = {
  id: string;
  question: string;
  answer?: string;
  createdAt: string;
  answeredAt?: string;
  motherId: string;
  mother?: {
    name?: string;
    email: string;
    age?: number;
    weeksPregnant?: number;
    dueDate?: string;
    conditions?: string;
    medications?: string;
  };
  prescriptions?: { key: string; url: string }[];
};

export default function DoctorDashboard() {
  const [token, setToken] = useState("");
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = localStorage.getItem("doctorToken") || "";
    setToken(t);
    if (t) loadQuestions(t);
  }, []);

  const headers = (t = token) => (t ? { Authorization: `Bearer ${t}` } : undefined);

  const loadQuestions = async (t = token) => {
    try {
      const res = await fetch("/api/doctor/questions", { headers: headers(t) });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error("Failed to load questions:", err);
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">Doctor Dashboard</h1>
            <p className="text-slate-600 mt-1">
              Answer questions from mothers with care and expertise.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/doctor/profile" className="btn-secondary text-sm">
              👤 My Profile
            </Link>
            <button
              className="btn-secondary text-sm"
              onClick={() => {
                localStorage.removeItem("doctorToken");
                location.href = "/";
              }}
            >
              Logout
            </button>
          </div>
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

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <DashboardCard title="Total Questions">
            <div className="text-3xl font-bold text-blue-600">{questions.length}</div>
          </DashboardCard>
          <DashboardCard title="Pending">
            <div className="text-3xl font-bold text-yellow-600">{unansweredQuestions.length}</div>
          </DashboardCard>
          <DashboardCard title="Answered">
            <div className="text-3xl font-bold text-green-600">{answeredQuestions.length}</div>
          </DashboardCard>
        </div>

        {/* Unanswered Questions */}
        {unansweredQuestions.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-slate-800">
              ⏳ Pending Questions ({unansweredQuestions.length})
            </h2>
            <div className="space-y-3">
              {unansweredQuestions.map((q) => (
                <ListCard
                  key={q.id}
                  title={q.mother?.name || q.mother?.email || "Mother"}
                  subtitle={q.question.length > 100 ? q.question.substring(0, 100) + "..." : q.question}
                  badge={<span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>}
                  onClick={() => setSelectedQuestion(q)}
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
              {/* Question */}
              <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                <p className="font-medium text-slate-800 mb-2">❓ Question:</p>
                <p className="text-slate-700">{selectedQuestion.question}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Asked on {new Date(selectedQuestion.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Patient Details */}
              {selectedQuestion.mother && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h4 className="font-semibold text-slate-800 mb-3">👤 Patient Information</h4>
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
                      <span className="font-medium text-slate-600">Weeks Pregnant:</span>
                      <span className="ml-2 text-slate-800">{selectedQuestion.mother.weeksPregnant || "N/A"}</span>
                    </div>
                    {selectedQuestion.mother.dueDate && (
                      <div>
                        <span className="font-medium text-slate-600">Due Date:</span>
                        <span className="ml-2 text-slate-800">
                          {new Date(selectedQuestion.mother.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
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
                  </div>

                  {/* Prescriptions */}
                  {selectedQuestion.prescriptions && selectedQuestion.prescriptions.length > 0 && (
                    <div className="mt-4">
                      <p className="font-medium text-slate-600 mb-2">📄 Prescriptions:</p>
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
                              📄 {fileName}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Answer Form */}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  💬 Your Answer:
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
                    {loading ? "Submitting..." : "✅ Submit Answer"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DetailModal>

        {/* Answered Questions - Minimal List */}
        {answeredQuestions.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-slate-800">
              ✅ Answered Questions ({answeredQuestions.length})
            </h2>
            <div className="space-y-3">
              {answeredQuestions.map((q) => (
                <ListCard
                  key={q.id}
                  title={q.mother?.name || q.mother?.email || "Mother"}
                  subtitle={q.question.length > 100 ? q.question.substring(0, 100) + "..." : q.question}
                  badge={<span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Answered</span>}
                  onClick={() => setSelectedQuestion(q)}
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
              <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                <p className="font-medium text-slate-800 mb-1">❓ Question:</p>
                <p className="text-sm text-slate-700">{selectedQuestion.question}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Asked on {new Date(selectedQuestion.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-3 border border-green-200">
                <p className="font-medium text-green-800 mb-1">✅ Your Answer:</p>
                <p className="text-sm text-slate-700">{selectedQuestion.answer}</p>
                {selectedQuestion.answeredAt && (
                  <p className="text-xs text-slate-500 mt-2">
                    Answered on {new Date(selectedQuestion.answeredAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Patient Details */}
              {selectedQuestion.mother && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h4 className="font-semibold text-slate-800 mb-3">👤 Patient Information</h4>
                  <div className="grid gap-3 md:grid-cols-2 text-sm">
                    <div>
                      <span className="font-medium text-slate-600">Name:</span>
                      <span className="ml-2 text-slate-800">{selectedQuestion.mother.name || "N/A"}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-600">Email:</span>
                      <span className="ml-2 text-slate-800">{selectedQuestion.mother.email}</span>
                    </div>
                    {selectedQuestion.mother.age && (
                      <div>
                        <span className="font-medium text-slate-600">Age:</span>
                        <span className="ml-2 text-slate-800">{selectedQuestion.mother.age}</span>
                      </div>
                    )}
                    {selectedQuestion.mother.weeksPregnant && (
                      <div>
                        <span className="font-medium text-slate-600">Weeks Pregnant:</span>
                        <span className="ml-2 text-slate-800">{selectedQuestion.mother.weeksPregnant}</span>
                      </div>
                    )}
                    {selectedQuestion.mother.dueDate && (
                      <div>
                        <span className="font-medium text-slate-600">Due Date:</span>
                        <span className="ml-2 text-slate-800">
                          {new Date(selectedQuestion.mother.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
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
                  </div>

                  {/* Prescriptions */}
                  {selectedQuestion.prescriptions && selectedQuestion.prescriptions.length > 0 && (
                    <div className="mt-4">
                      <p className="font-medium text-slate-600 mb-2">📄 Prescriptions:</p>
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
                              📄 {fileName}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DetailModal>

        {/* Empty State */}
        {questions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👨‍⚕️</div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No questions yet</h3>
            <p className="text-slate-600">Questions from mothers will appear here</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
