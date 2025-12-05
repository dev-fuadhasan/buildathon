"use client";

import DashboardCard from "@/components/DashboardCard";
import Layout from "@/components/Layout";
import { useEffect, useState } from "react";

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
type Question = { id: string; question: string; answer?: string; createdAt: string };

export default function MotherDashboard() {
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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
    const res = await fetch("/api/mother/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error || "Could not save profile");
      return;
    }
    setProfile(data.profile);
    setMessage("Profile updated");
  };

  const uploadPrescription = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/mother/prescriptions", {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Uploaded prescription");
      fileInput.value = "";
      fetchPrescriptions();
    } else {
      setMessage(data.error || "Upload failed");
    }
  };

  const submitQuestion = async () => {
    const text = questionText.trim();
    if (!text) return;
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
      fetchQuestions();
    } else {
      setMessage(data.error || "Could not send question");
    }
  };

  if (!token) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl">
          <h1 className="text-2xl font-bold">Mother Dashboard</h1>
          <p className="text-slate-600">Please log in to continue.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back</h1>
            <p className="text-slate-600">
              Keep your details fresh to get more personalized guidance.
            </p>
          </div>
          <button
            className="text-sm text-pink-600 underline"
            onClick={() => {
              localStorage.removeItem("motherToken");
              location.reload();
            }}
          >
            Logout
          </button>
        </div>

        <DashboardCard title="Your profile">
          {profile && (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={saveProfile}>
              <input
                className="input"
                placeholder="Full name"
                value={profile.name || ""}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
              <input className="input" value={profile.email} disabled />
              <input
                className="input"
                placeholder="Age"
                type="number"
                value={profile.age ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, age: Number(e.target.value) || undefined })
                }
              />
              <input
                className="input"
                placeholder="Weeks pregnant"
                type="number"
                value={profile.weeksPregnant ?? ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    weeksPregnant: Number(e.target.value) || undefined,
                  })
                }
              />
              <input
                className="input"
                placeholder="Due date"
                type="date"
                value={profile.dueDate || ""}
                onChange={(e) => setProfile({ ...profile, dueDate: e.target.value })}
              />
              <input
                className="input"
                placeholder="Medical conditions"
                value={profile.conditions || ""}
                onChange={(e) => setProfile({ ...profile, conditions: e.target.value })}
              />
              <input
                className="input md:col-span-2"
                placeholder="Medications"
                value={profile.medications || ""}
                onChange={(e) => setProfile({ ...profile, medications: e.target.value })}
              />
              <button type="submit" className="btn-primary md:col-span-2" disabled={loading}>
                {loading ? "Saving..." : "Save profile"}
              </button>
            </form>
          )}
          {message && <p className="text-sm text-slate-600">{message}</p>}
        </DashboardCard>

        <div className="grid gap-4 md:grid-cols-2">
          <DashboardCard title="Prescriptions">
            <form onSubmit={uploadPrescription} className="space-y-3">
              <input type="file" name="file" className="input" accept=".pdf,.png,.jpg,.jpeg" />
              <button type="submit" className="btn-primary">
                Upload file
              </button>
            </form>
            <div className="mt-3 space-y-2">
              {prescriptions.length === 0 && (
                <p className="text-sm text-slate-500">No prescriptions uploaded yet.</p>
              )}
              {prescriptions.map((p) => (
                <a
                  key={p.key}
                  className="block text-sm text-pink-600 underline"
                  href={p.url}
                  target="_blank"
                >
                  {p.key.split("/").pop()}
                </a>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard title="Ask a doctor">
            <div className="space-y-3">
              <textarea
                className="input h-24"
                placeholder="Type your question..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />
              <button className="btn-primary" onClick={submitQuestion}>
                Send question
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {questions.map((q) => (
                <div key={q.id} className="rounded-lg border border-slate-100 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-700">{q.question}</p>
                  {q.answer ? (
                    <p className="mt-1 text-sm text-emerald-700">Answer: {q.answer}</p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">Waiting for doctor</p>
                  )}
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>
      </div>
    </Layout>
  );
}

