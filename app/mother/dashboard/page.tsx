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
  daysPregnant?: number;
  dueDate?: string;
  timezone?: string;
  conditions?: string;
  medications?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  previousPregnancies?: number;
  allergies?: string;
};

type JournalEntry = {
  id: string;
  date: string;
  entry: string;
  createdAt: string;
  updatedAt: string;
};

type Notification = {
  id: string;
  type: "morning_recommendation" | "evening_recommendation" | "daily_task" | "general";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
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
  hasNewActivity?: boolean;
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
  const [activeTab, setActiveTab] = useState<"profile" | "prescriptions" | "questions" | "progress" | "journal" | "notifications">("profile");
  const [deletingPrescription, setDeletingPrescription] = useState<string | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [todayJournal, setTodayJournal] = useState("");
  const [selectedJournalDate, setSelectedJournalDate] = useState<string>("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

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
    fetchJournalEntries(t);
    fetchNotifications(t);
    // Update pregnancy progress and check for daily tasks/recommendations
    updatePregnancyProgress(t);
    checkDailyTask(t);
    checkRecommendations(t);
    
    // Set up interval to check for daily tasks (every hour)
    const interval = setInterval(() => {
      checkDailyTask(t);
      checkRecommendations(t);
    }, 60 * 60 * 1000); // Check every hour
    
    return () => clearInterval(interval);
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

  const updatePregnancyProgress = async (t = token) => {
    try {
      await fetch("/api/mother/update-progress", {
        method: "POST",
        headers: authHeaders(t),
      });
      // Reload profile to get updated days
      fetchProfile(t);
    } catch (err) {
      console.error("Failed to update pregnancy progress:", err);
    }
  };

  const fetchJournalEntries = async (t = token) => {
    try {
      const res = await fetch("/api/mother/journal", { headers: authHeaders(t) });
      if (res.ok) {
        const data = await res.json();
        setJournalEntries(data.entries || []);
        
        // Load today's entry if exists
        const today = new Date().toISOString().split("T")[0];
        const todayEntry = data.entries?.find((e: JournalEntry) => e.date === today);
        if (todayEntry) {
          setTodayJournal(todayEntry.entry);
          setSelectedJournalDate(today);
        } else {
          setSelectedJournalDate(today);
        }
      }
    } catch (err) {
      console.error("Failed to fetch journal entries:", err);
    }
  };

  const fetchNotifications = async (t = token) => {
    try {
      const res = await fetch("/api/mother/notifications", { headers: authHeaders(t) });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.filter((n: Notification) => !n.read).length || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const checkDailyTask = async (t = token) => {
    try {
      await fetch("/api/mother/check-daily-task", {
        method: "POST",
        headers: authHeaders(t),
      });
      fetchNotifications(t); // Refresh notifications
    } catch (err) {
      // Silent fail - this is a background check
    }
  };

  const checkRecommendations = async (t = token) => {
    try {
      await fetch("/api/mother/generate-recommendations", {
        method: "POST",
        headers: authHeaders(t),
      });
      fetchNotifications(t); // Refresh notifications
    } catch (err) {
      // Silent fail - this is a background check
    }
  };

  const saveJournalEntry = async () => {
    if (!selectedJournalDate || !todayJournal.trim()) {
      setMessage("Please write something in your journal");
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const existing = journalEntries.find((e) => e.date === selectedJournalDate);
      
      const res = await fetch("/api/mother/journal", {
        method: existing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          date: selectedJournalDate,
          entry: todayJournal.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Journal entry saved successfully!");
        fetchJournalEntries();
      } else {
        setMessage(`❌ ${data.error || "Failed to save journal entry"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/mother/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          notificationId,
          markAsRead: true,
        }),
      });
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
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
      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        // If parsing fails, use empty object
      }
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
      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        // If parsing fails, use empty object
      }
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
    // Use days if available, otherwise calculate from weeks
    const currentDays = profile?.daysPregnant || (profile?.weeksPregnant ? profile.weeksPregnant * 7 : 0);
    if (!currentDays) return null;
    
    const totalDays = 280; // 40 weeks * 7 days
    const totalWeeks = 40;
    const currentWeeks = Math.floor(currentDays / 7);
    const percentage = Math.min((currentDays / totalDays) * 100, 100);
    return { percentage, weeks: currentWeeks, days: currentDays, total: totalWeeks };
  };

  const progress = calculateProgress();

  if (!token) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent mb-4">
            {t.mother.dashboard}
          </h1>
          <p className="text-slate-600 mb-6">{t.common.pleaseLogin}</p>
          <Link href="/mother/login" className="btn-primary inline-block">
            {t.common.login}
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
        <div className="flex gap-2 border-b-2 border-slate-200 mb-6 overflow-x-auto">
          {[
            { id: "profile", label: `👤 ${t.mother.profile}`, icon: "👤" },
            { id: "prescriptions", label: `📄 ${t.mother.prescriptions}`, icon: "📄" },
            { id: "questions", label: `❓ ${t.mother.questions}`, icon: "❓" },
            { id: "progress", label: `📊 ${t.mother.progress}`, icon: "📊" },
            { id: "journal", label: `📝 Journal`, icon: "📝" },
            { id: "notifications", label: `🔔 Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}`, icon: "🔔" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 font-semibold transition-all duration-200 rounded-t-lg ${
                activeTab === tab.id
                  ? "bg-gradient-to-b from-pink-50 to-white border-t-2 border-l-2 border-r-2 border-pink-600 text-pink-600 shadow-sm"
                  : "text-slate-600 hover:text-pink-600 hover:bg-pink-50/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <DashboardCard title={t.mother.yourHealthProfile}>
            {profile && (
              <form className="space-y-4" onSubmit={saveProfile}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t.mother.name}
                    </label>
                    <input
                      className="input w-full"
                      placeholder={t.mother.enterName}
                      value={profile.name || ""}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t.mother.email}
                    </label>
                    <input className="input w-full" value={profile.email} disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t.mother.age}
                    </label>
                    <input
                      className="input w-full"
                      placeholder={t.mother.enterAge}
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
                      Days Pregnant
                    </label>
                    <input
                      className="input w-full"
                      placeholder="e.g., 140 (20 weeks)"
                      type="number"
                      min="1"
                      max="280"
                      value={profile.daysPregnant ?? ""}
                      onChange={(e) => {
                        const days = Number(e.target.value) || undefined;
                        setProfile({
                          ...profile,
                          daysPregnant: days,
                          weeksPregnant: days ? Math.floor(days / 7) : undefined, // Auto-calculate weeks
                        });
                      }}
                    />
                    {profile.daysPregnant && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-lg text-sm">
                        <p className="text-blue-800">
                          <strong>Calculated:</strong> {Math.floor((profile.daysPregnant || 0) / 7)} weeks,{" "}
                          {Math.floor((profile.daysPregnant || 0) / 30)} months
                        </p>
                      </div>
                    )}
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
                    {t.mother.emergencyContact}
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
          <DashboardCard title={t.mother.prescriptions}>
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
                <h3 className="text-lg font-semibold mb-3 text-slate-800">
                  {t.mother.totalPrescriptions}: {prescriptions.length}
                </h3>
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
                          <div className="flex gap-2">
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary text-sm"
                            >
                              View
                            </a>
                            <button
                              onClick={async () => {
                                if (!confirm("Are you sure you want to delete this prescription?")) {
                                  return;
                                }
                                setDeletingPrescription(p.key);
                                try {
                                  const encodedKey = encodeURIComponent(p.key);
                                  const res = await fetch(`/api/mother/prescriptions/${encodedKey}`, {
                                    method: "DELETE",
                                    headers: authHeaders(),
                                  });
                                  if (res.ok) {
                                    setMessage(`✅ ${t.mother.prescriptionDeleted || "Prescription deleted successfully"}`);
                                    fetchPrescriptions();
                                  } else {
                                    let data: any = {};
                                    try {
                                      const text = await res.text();
                                      data = text ? JSON.parse(text) : {};
                                    } catch {}
                                    setMessage(`❌ ${data.error || "Failed to delete prescription"}`);
                                  }
                                } catch (err) {
                                  setMessage(`❌ Network error`);
                                } finally {
                                  setDeletingPrescription(null);
                                }
                              }}
                              disabled={deletingPrescription === p.key}
                              className="btn-secondary text-sm bg-red-50 text-red-600 border-red-200 hover:bg-red-100 disabled:opacity-50"
                            >
                              {deletingPrescription === p.key ? "..." : "🗑️"}
                            </button>
                          </div>
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
          <div className="space-y-6">
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
              {questions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>{t.mother.noQuestions}</p>
                  <p className="text-sm mt-1">{t.mother.askDoctor}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Answered Questions - Grid View */}
                  {questions.filter(q => q.answer).length > 0 && (
                    <div>
                      <h3 className="font-semibold text-green-700 mb-3">✅ Answered Questions</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {questions.filter(q => q.answer).map((q) => (
                          <div
                            key={q.id}
                            className="rounded-lg border-2 border-green-200 bg-green-50 p-4 relative"
                          >
                            {/* Notification Badge */}
                            {q.hasNewActivity && (
                              <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                            )}
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-medium text-slate-700 line-clamp-2 flex-1">{q.question}</p>
                            </div>
                            <p className="text-xs text-slate-500 mb-3">
                              {new Date(q.createdAt).toLocaleDateString()}
                            </p>
                            <div className="mt-2 rounded bg-white p-2 mb-3">
                              <p className="text-xs font-medium text-green-700 mb-1">👨‍⚕️ Answer:</p>
                              <p className="text-sm text-slate-700 line-clamp-2">{q.answer}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                className="btn-secondary flex-1 text-sm"
                                onClick={() => {
                                  // Mark as seen
                                  fetch(`/api/mother/questions/${q.id}/mark-seen`, {
                                    method: "POST",
                                    headers: authHeaders(),
                                  });
                                  // Show full details in modal
                                  setSelectedQuestion(q);
                                }}
                              >
                                👁️ View Full Details
                              </button>
                              {q.answer && (
                                <button
                                  className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-2 rounded transition-colors"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const reason = prompt("Please provide a reason for reporting this answer:");
                                    if (reason) {
                                      try {
                                        const res = await fetch(`/api/mother/questions/${q.id}/report`, {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                            ...authHeaders(),
                                          },
                                          body: JSON.stringify({ reason }),
                                        });
                                        if (res.ok) {
                                          alert("Report submitted successfully. Admin will review it.");
                                          fetchQuestions();
                                        } else {
                                          alert("Failed to submit report. Please try again.");
                                        }
                                      } catch (err) {
                                        alert("Network error. Please try again.");
                                      }
                                    }
                                  }}
                                >
                                  🚨 Report
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unanswered Questions - List View */}
                  {questions.filter(q => !q.answer).length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-yellow-700 mb-3">⏳ Pending Questions</h3>
                      <div className="space-y-3">
                        {questions.filter(q => !q.answer).map((q) => (
                          <div
                            key={q.id}
                            className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 relative"
                          >
                            {/* Notification Badge */}
                            {q.hasNewActivity && (
                              <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                            )}
                            <div className="flex items-start justify-between">
                              <p className="font-medium text-slate-700 flex-1">{q.question}</p>
                              <span className="text-xs text-slate-500 ml-2">
                                {new Date(q.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-sm text-yellow-700">
                              <span>⏳</span>
                              <span>{t.mother.waiting}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DashboardCard>
          </div>
        )}

        {/* Question Details Modal */}
        {selectedQuestion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">Question Details</h2>
                <button
                  onClick={() => {
                    setSelectedQuestion(null);
                    fetchQuestions();
                  }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Question</p>
                  <p className="text-lg text-slate-800">{selectedQuestion.question}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Asked on {new Date(selectedQuestion.createdAt).toLocaleString()}
                  </p>
                </div>
                {selectedQuestion.answer && (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium text-green-700">👨‍⚕️ Doctor's Answer</p>
                      <button
                        className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors"
                        onClick={async () => {
                          const reason = prompt("Please provide a reason for reporting this answer:");
                          if (reason) {
                            try {
                              const res = await fetch(`/api/mother/questions/${selectedQuestion.id}/report`, {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  ...authHeaders(),
                                },
                                body: JSON.stringify({ reason }),
                              });
                              if (res.ok) {
                                alert("Report submitted successfully. Admin will review it.");
                                setSelectedQuestion(null);
                                fetchQuestions();
                              } else {
                                alert("Failed to submit report. Please try again.");
                              }
                            } catch (err) {
                              alert("Network error. Please try again.");
                            }
                          }
                        }}
                      >
                        🚨 Report
                      </button>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedQuestion.answer}</p>
                    {selectedQuestion.answeredAt && (
                      <p className="text-xs text-slate-500 mt-2">
                        Answered on {new Date(selectedQuestion.answeredAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
                {motherId && selectedQuestion.id && (
                  <div className="border-t border-slate-200 pt-4">
                    <CommentSection
                      questionId={selectedQuestion.id}
                      userRole="mother"
                      userId={motherId}
                      token={token}
                      comments={selectedQuestion.comments}
                      onCommentAdded={() => {
                        fetchQuestions(token);
                        // Refresh selected question
                        fetch(`/api/mother/questions`, { headers: authHeaders() })
                          .then(r => r.json())
                          .then(d => {
                            const updated = d.questions.find((q: any) => q.id === selectedQuestion.id);
                            if (updated) setSelectedQuestion(updated);
                          });
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
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
                      <span className="font-medium">
                        {progress.days 
                          ? `${Math.floor(progress.days / 7)} weeks ${progress.days % 7} days`
                          : `Week ${progress.weeks}`
                        } of {progress.total} weeks
                      </span>
                      <span className="text-pink-600 font-semibold">{Math.round(progress.percentage)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-pink-500 to-pink-600 h-4 rounded-full transition-all duration-500"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </div>
                  {profile?.daysPregnant && (
                    <div className="rounded-lg bg-pink-50 p-4">
                      <p className="text-sm font-medium text-pink-700 mb-1">📊 Pregnancy Progress</p>
                      <p className="text-lg font-semibold text-pink-900">
                        {Math.floor((profile.daysPregnant || 0) / 7)} weeks, {Math.floor((profile.daysPregnant || 0) / 30)} months
                      </p>
                      <p className="text-sm text-pink-700 mt-1">
                        {profile.daysPregnant} days pregnant
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

        {/* Journal Tab */}
        {activeTab === "journal" && (
          <div className="space-y-6">
            <DashboardCard title="📝 Daily Journal">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    className="input w-full"
                    value={selectedJournalDate}
                    onChange={(e) => {
                      const date = e.target.value;
                      setSelectedJournalDate(date);
                      const entry = journalEntries.find((entry) => entry.date === date);
                      setTodayJournal(entry?.entry || "");
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    How was your day? (You can write in English, Bangla, or Banglish)
                  </label>
                  <textarea
                    className="input w-full h-64"
                    placeholder="Write about your day, what you ate, how you're feeling, any symptoms, activities, etc..."
                    value={todayJournal}
                    onChange={(e) => setTodayJournal(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    💡 Tip: Write freely about your day, meals, feelings, and any concerns. This helps AI provide better recommendations.
                  </p>
                </div>
                <button
                  className="btn-primary w-full"
                  onClick={saveJournalEntry}
                  disabled={loading || !todayJournal.trim()}
                >
                  {loading ? "Saving..." : "💾 Save Journal Entry"}
                </button>
              </div>
            </DashboardCard>

            <DashboardCard title="📚 Journal History">
              {journalEntries.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No journal entries yet. Start writing your daily journal!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {journalEntries
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedJournalDate(entry.date);
                          setTodayJournal(entry.entry);
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-slate-800">
                            {new Date(entry.date).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          <span className="text-xs text-slate-500">
                            {new Date(entry.updatedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 line-clamp-3">
                          {entry.entry}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </DashboardCard>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <DashboardCard title="🔔 Notifications">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No notifications yet. You'll receive recommendations and daily task reminders here!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      notification.read
                        ? "border-slate-200 bg-slate-50"
                        : "border-pink-200 bg-pink-50"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-slate-800">{notification.title}</h4>
                      {!notification.read && (
                        <button
                          className="text-xs text-pink-600 hover:text-pink-700"
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {notification.message}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>
        )}
      </div>
    </Layout>
  );
}
