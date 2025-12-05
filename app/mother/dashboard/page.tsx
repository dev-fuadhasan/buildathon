"use client";

import DashboardCard from "@/components/DashboardCard";
import Layout from "@/components/Layout";
import CommentSection from "@/components/CommentSection";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { getLanguage } from "@/lib/i18n";

type Profile = {
  name?: string;
  email: string;
  age?: number;
  phone?: string;
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
};

type Prescription = { key: string; url: string };
type Comment = {
  id: string;
  authorId: string;
  authorRole: "doctor" | "mother";
  content: string;
  createdAt: string;
  replies?: Comment[];
};
type Question = { 
  id: string; 
  question: string; 
  answer?: string; 
  createdAt: string; 
  answeredAt?: string;
  comments?: Comment[];
};

export default function MotherDashboard() {
  const t = useTranslation();
  const [token, setToken] = useState("");
  const [motherId, setMotherId] = useState("");
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
    // Get mother ID from token
    try {
      const payload = JSON.parse(atob(t.split('.')[1]));
      setMotherId(payload.id || "");
    } catch {
      // Will be set when profile loads
    }
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
      if (data.profile?.id && !motherId) {
        setMotherId(data.profile.id);
      }
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
      setMessage(`✅ ${t.mother.profileUpdated}`);
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
        setMessage(`✅ ${t.mother.prescriptionUploaded}`);
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
        setMessage(`✅ ${t.mother.questionSubmitted}`);
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
              {t.mother.welcome}{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}!
            </h1>
            <p className="text-slate-600 mt-1">
              {t.home.mothersDesc}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/chat" className="btn-secondary">
              💬 {t.chat.title}
            </Link>
            <button
              className="btn-secondary text-sm"
              onClick={() => {
                localStorage.removeItem("motherToken");
                location.href = "/";
              }}
            >
              {t.common.logout}
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
            { id: "profile", label: `👤 ${t.mother.profile}`, icon: "👤" },
            { id: "prescriptions", label: `📄 ${t.mother.prescriptions}`, icon: "📄" },
            { id: "questions", label: `❓ ${t.mother.questions}`, icon: "❓" },
            { id: "progress", label: `📊 ${t.mother.progress}`, icon: "📊" },
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
                      {t.mother.dueDate}
                    </label>
                    <input
                      className="input w-full"
                      placeholder={t.mother.dueDate}
                      type="date"
                      value={profile.dueDate || ""}
                      onChange={(e) => setProfile({ ...profile, dueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t.mother.phone}
                    </label>
                    <input
                      className="input w-full"
                      placeholder={t.mother.enterPhone}
                      type="tel"
                      value={profile.phone || ""}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t.mother.bloodGroup}
                    </label>
                    <select
                      className="input w-full"
                      value={profile.bloodGroup || ""}
                      onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                    >
                      <option value="">{t.mother.selectBloodGroup}</option>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t.mother.previousPregnancies}
                    </label>
                    <input
                      className="input w-full"
                      placeholder={t.mother.previousPregnancies}
                      type="number"
                      min="0"
                      value={profile.previousPregnancies ?? ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          previousPregnancies: Number(e.target.value) || undefined,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t.mother.address}
                  </label>
                  <textarea
                    className="input w-full h-20"
                    placeholder={t.mother.enterAddress}
                    value={profile.address || ""}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t.mother.conditions}
                    </label>
                    <input
                      className="input w-full"
                      placeholder={t.mother.enterConditions}
                      value={profile.conditions || ""}
                      onChange={(e) => setProfile({ ...profile, conditions: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t.mother.allergies}
                    </label>
                    <input
                      className="input w-full"
                      placeholder={t.mother.enterAllergies}
                      value={profile.allergies || ""}
                      onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t.mother.medications}
                  </label>
                  <textarea
                    className="input w-full h-24"
                    placeholder={t.mother.enterMedications}
                    value={profile.medications || ""}
                    onChange={(e) => setProfile({ ...profile, medications: e.target.value })}
                  />
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="font-semibold text-slate-800 mb-3">
                    {t.mother.emergencyContact} Information
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t.mother.emergencyContact}
                      </label>
                      <input
                        className="input w-full"
                        placeholder={t.mother.enterEmergencyContact}
                        value={profile.emergencyContact || ""}
                        onChange={(e) =>
                          setProfile({ ...profile, emergencyContact: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t.mother.emergencyPhone}
                      </label>
                      <input
                        className="input w-full"
                        placeholder={t.mother.enterEmergencyPhone}
                        type="tel"
                        value={profile.emergencyPhone || ""}
                        onChange={(e) =>
                          setProfile({ ...profile, emergencyPhone: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? t.common.loading : `💾 ${t.common.save} ${t.mother.profile}`}
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
                      {t.mother.uploadPrescription} (PDF, PNG, JPG - Max 10MB)
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
                    {uploading ? `⏳ ${t.common.loading}` : `📤 ${t.mother.uploadPrescription}`}
                  </button>
                </form>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Your Prescriptions ({prescriptions.length})</h3>
                {prescriptions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p className="text-lg mb-2">{t.mother.noPrescriptions}</p>
                    <p className="text-sm">{t.mother.uploadPrescription}</p>
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
            <DashboardCard title={t.mother.askDoctor}>
              <div className="space-y-4">
                <textarea
                  className="input w-full h-32"
                  placeholder={t.mother.questionPlaceholder}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  disabled={loading}
                />
                <button className="btn-primary w-full" onClick={submitQuestion} disabled={loading || !questionText.trim()}>
                  {loading ? t.common.loading : `📤 ${t.common.submit} ${t.mother.questions.split(" ")[0]}`}
                </button>
                <p className="text-xs text-slate-500">
                  💡 Tip: Include details about symptoms, timing, and any concerns you have.
                </p>
              </div>
            </DashboardCard>

            <DashboardCard title={t.mother.yourQuestions}>
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>{t.mother.noQuestions}</p>
                    <p className="text-sm mt-1">{t.mother.askDoctor}</p>
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
                          <p className="text-sm font-medium text-green-700 mb-1">👨‍⚕️ {t.mother.answered}:</p>
                          <p className="text-sm text-slate-700">{q.answer}</p>
                          {q.answeredAt && (
                            <p className="text-xs text-slate-500 mt-2">
                              {t.doctor.answeredOn || "Answered on"} {new Date(q.answeredAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-2 text-sm text-yellow-700">
                          <span>⏳</span>
                          <span>{t.mother.waiting}</span>
                        </div>
                      )}
                      
                      {/* Comments Section */}
                      {motherId && (
                        <div className="mt-4 border-t border-slate-200 pt-4">
                          <CommentSection
                            questionId={q.id}
                            userRole="mother"
                            userId={motherId}
                            token={token}
                            comments={q.comments}
                            onCommentAdded={() => fetchQuestions(token)}
                          />
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
