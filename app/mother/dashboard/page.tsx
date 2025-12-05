"use client";

import DashboardCard from "@/components/DashboardCard";
import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import Link from "next/link";

type Profile = {
  name?: string;
  email: string;
  age?: number;
  weeksPregnant?: number;
  dueDate?: string;
  conditions?: string;
  medications?: string;
};

type Prescription = { key: string; url: string };
type Question = { id: string; question: string; answer?: string; createdAt: string; answeredAt?: string };

export default function MotherDashboard() {
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "prescriptions" | "questions" | "progress">("profile");

  useEffect(() => {
    const t = localStorage.getItem("motherToken") || "";
    setToken(t);
    if (!t) return;
    fetchProfile(t);
    fetchPrescriptions(t);
    fetchQuestions(t);
  }, []);

  const authHeaders = (t = token) =>
    t ? { Authorization: `Bearer ${t}` } : undefined;

  const fetchProfile = async (t = token) => {
    const res = await fetch("/api/mother/profile", { headers: authHeaders(t) });
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
    }
  };

  const fetchPrescriptions = async (t = token) => {
    const res = await fetch("/api/mother/prescriptions", {
      headers: authHeaders(t),
    });
    if (res.ok) {
      const data = await res.json();
      setPrescriptions(data.items || []);
    }
  };

  const fetchQuestions = async (t = token) => {
    const res = await fetch("/api/mother/questions", { headers: authHeaders(t) });
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.questions || []);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/mother/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`❌ ${data.error || "Could not save profile"}`);
        return;
      }
      setProfile(data.profile);
      setMessage("✅ Profile updated successfully!");
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const uploadPrescription = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setMessage("Please select a file");
      return;
    }
    
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setMessage("❌ Please upload PDF, PNG, or JPG files only");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setMessage("❌ File size must be less than 10MB");
      return;
    }
    
    setUploading(true);
    setMessage("");
    const fd = new FormData();
    fd.append("file", file);
    
    try {
      const res = await fetch("/api/mother/prescriptions", {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Prescription uploaded successfully!");
        fileInput.value = "";
        fetchPrescriptions();
      } else {
        setMessage(`❌ ${data.error || "Upload failed. Please try again."}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  const submitQuestion = async () => {
    const text = questionText.trim();
    if (!text) {
      setMessage("Please enter a question");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/mother/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setQuestionText("");
        setMessage("✅ Question submitted! A doctor will respond soon.");
        fetchQuestions();
      } else {
        setMessage(`❌ ${data.error || "Could not send question"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!profile?.weeksPregnant || !profile?.dueDate) return null;
    const totalWeeks = 40;
    const currentWeeks = profile.weeksPregnant;
    const percentage = Math.min((currentWeeks / totalWeeks) * 100, 100);
    return { percentage, weeks: currentWeeks, total: totalWeeks };
  };

  const progress = calculateProgress();

  if (!token) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-3xl font-bold mb-4">Mother Dashboard</h1>
          <p className="text-slate-600 mb-6">Please log in to continue.</p>
          <Link href="/mother/login" className="btn-primary inline-block">
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
            <h1 className="text-3xl font-bold text-pink-600">
              Welcome back{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}!
            </h1>
            <p className="text-slate-600 mt-1">
              Manage your pregnancy journey with personalized care.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/chat" className="btn-secondary">
              💬 Chat with AI
            </Link>
            <button
              className="btn-secondary text-sm"
              onClick={() => {
                localStorage.removeItem("motherToken");
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

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          {[
            { id: "profile", label: "👤 Profile", icon: "👤" },
            { id: "prescriptions", label: "📄 Prescriptions", icon: "📄" },
            { id: "questions", label: "❓ Q&A with Doctors", icon: "❓" },
            { id: "progress", label: "📊 Progress", icon: "📊" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-pink-600 text-pink-600"
                  : "text-slate-600 hover:text-pink-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <DashboardCard title="Your Health Profile">
            {profile && (
              <form className="space-y-4" onSubmit={saveProfile}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      className="input w-full"
                      placeholder="Enter your full name"
                      value={profile.name || ""}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <input className="input w-full" value={profile.email} disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Age
                    </label>
                    <input
                      className="input w-full"
                      placeholder="Your age"
                      type="number"
                      min="18"
                      max="50"
                      value={profile.age ?? ""}
                      onChange={(e) =>
                        setProfile({ ...profile, age: Number(e.target.value) || undefined })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Weeks Pregnant
                    </label>
                    <input
                      className="input w-full"
                      placeholder="e.g., 20"
                      type="number"
                      min="1"
                      max="42"
                      value={profile.weeksPregnant ?? ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          weeksPregnant: Number(e.target.value) || undefined,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Due Date
                    </label>
                    <input
                      className="input w-full"
                      placeholder="Select due date"
                      type="date"
                      value={profile.dueDate || ""}
                      onChange={(e) => setProfile({ ...profile, dueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Medical Conditions
                    </label>
                    <input
                      className="input w-full"
                      placeholder="e.g., Gestational diabetes"
                      value={profile.conditions || ""}
                      onChange={(e) => setProfile({ ...profile, conditions: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Current Medications
                  </label>
                  <textarea
                    className="input w-full h-24"
                    placeholder="List your current medications and dosages"
                    value={profile.medications || ""}
                    onChange={(e) => setProfile({ ...profile, medications: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Saving..." : "💾 Save Profile"}
                </button>
              </form>
            )}
          </DashboardCard>
        )}

        {/* Prescriptions Tab */}
        {activeTab === "prescriptions" && (
          <DashboardCard title="Prescription Management">
            <div className="space-y-6">
              <div className="rounded-lg border-2 border-dashed border-pink-200 bg-pink-50 p-6">
                <form onSubmit={uploadPrescription} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Upload Prescription (PDF, PNG, JPG - Max 10MB)
                    </label>
                    <input
                      type="file"
                      name="file"
                      className="input w-full"
                      accept=".pdf,.png,.jpg,.jpeg"
                      disabled={uploading}
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={uploading}>
                    {uploading ? "⏳ Uploading..." : "📤 Upload Prescription"}
                  </button>
                </form>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Your Prescriptions ({prescriptions.length})</h3>
                {prescriptions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p className="text-lg mb-2">No prescriptions uploaded yet</p>
                    <p className="text-sm">Upload your first prescription above</p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {prescriptions.map((p) => {
                      const fileName = p.key.split("/").pop() || "prescription";
                      return (
                        <div
                          key={p.key}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">📄</div>
                            <div>
                              <p className="font-medium text-slate-700">{fileName}</p>
                              <p className="text-xs text-slate-500">Click to view</p>
                            </div>
                          </div>
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary text-sm"
                          >
                            View
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </DashboardCard>
        )}

        {/* Questions Tab */}
        {activeTab === "questions" && (
          <div className="grid gap-6 md:grid-cols-2">
            <DashboardCard title="Ask a Doctor">
              <div className="space-y-4">
                <textarea
                  className="input w-full h-32"
                  placeholder="Type your question here... Be specific about your concerns."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  disabled={loading}
                />
                <button className="btn-primary w-full" onClick={submitQuestion} disabled={loading || !questionText.trim()}>
                  {loading ? "Sending..." : "📤 Submit Question"}
                </button>
                <p className="text-xs text-slate-500">
                  💡 Tip: Include details about symptoms, timing, and any concerns you have.
                </p>
              </div>
            </DashboardCard>

            <DashboardCard title="Your Questions & Answers">
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>No questions yet</p>
                    <p className="text-sm mt-1">Ask your first question to get started</p>
                  </div>
                ) : (
                  questions.map((q) => (
                    <div
                      key={q.id}
                      className={`rounded-lg border p-4 ${
                        q.answer
                          ? "border-green-200 bg-green-50"
                          : "border-yellow-200 bg-yellow-50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-slate-700">{q.question}</p>
                        <span className="text-xs text-slate-500">
                          {new Date(q.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {q.answer ? (
                        <div className="mt-3 rounded bg-white p-3">
                          <p className="text-sm font-medium text-green-700 mb-1">👨‍⚕️ Doctor's Answer:</p>
                          <p className="text-sm text-slate-700">{q.answer}</p>
                          {q.answeredAt && (
                            <p className="text-xs text-slate-500 mt-2">
                              Answered on {new Date(q.answeredAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-2 text-sm text-yellow-700">
                          <span>⏳</span>
                          <span>Waiting for doctor's response...</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </DashboardCard>
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === "progress" && (
          <div className="grid gap-6 md:grid-cols-2">
            <DashboardCard title="Pregnancy Progress">
              {progress ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Week {progress.weeks} of {progress.total}</span>
                      <span className="text-pink-600 font-semibold">{Math.round(progress.percentage)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-pink-500 to-pink-600 h-4 rounded-full transition-all duration-500"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </div>
                  {profile?.dueDate && (
                    <div className="rounded-lg bg-pink-50 p-4">
                      <p className="text-sm font-medium text-pink-700 mb-1">📅 Due Date</p>
                      <p className="text-lg font-semibold text-pink-900">
                        {new Date(profile.dueDate).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>Complete your profile to see progress</p>
                  <button
                    onClick={() => setActiveTab("profile")}
                    className="btn-secondary mt-3"
                  >
                    Update Profile
                  </button>
                </div>
              )}
            </DashboardCard>

            <DashboardCard title="Quick Stats">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                  <span className="text-sm font-medium">Prescriptions</span>
                  <span className="text-2xl font-bold text-blue-600">{prescriptions.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                  <span className="text-sm font-medium">Questions Asked</span>
                  <span className="text-2xl font-bold text-green-600">{questions.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50">
                  <span className="text-sm font-medium">Answered</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {questions.filter((q) => q.answer).length}
                  </span>
                </div>
              </div>
            </DashboardCard>
          </div>
        )}
      </div>
    </Layout>
  );
}
