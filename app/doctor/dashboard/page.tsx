"use client";

import DashboardCard from "@/components/DashboardCard";
import Layout from "@/components/Layout";
import { useEffect, useState } from "react";

type QuestionItem = {
  id: string;
  question: string;
  answer?: string;
  createdAt: string;
  mother?: {
    name?: string;
    email: string;
    age?: number;
    weeksPregnant?: number;
    conditions?: string;
    medications?: string;
  };
  prescriptions?: { key: string; url: string }[];
};

export default function DoctorDashboard() {
  const [token, setToken] = useState("");
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("doctorToken") || "";
    setToken(t);
    if (t) loadQuestions(t);
  }, []);

  const headers = (t = token) => (t ? { Authorization: `Bearer ${t}` } : undefined);

  const loadQuestions = async (t = token) => {
    const res = await fetch("/api/doctor/questions", { headers: headers(t) });
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.questions || []);
    }
  };

  const submitAnswer = async (id: string, answer: string) => {
    if (!answer.trim()) return;
    const res = await fetch("/api/doctor/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers() },
      body: JSON.stringify({ questionId: id, answer }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Answer submitted");
      loadQuestions();
    } else {
      setMessage(data.error || "Could not submit answer");
    }
  };

  if (!token) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl">
          <h1 className="text-2xl font-bold">Doctor Dashboard</h1>
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
            <h1 className="text-3xl font-bold">Doctor Questions</h1>
            <p className="text-slate-600">Answer mothers with empathy and clarity.</p>
          </div>
          <button
            className="text-sm text-pink-600 underline"
            onClick={() => {
              localStorage.removeItem("doctorToken");
              location.reload();
            }}
          >
            Logout
          </button>
        </div>
        {message && <p className="text-sm text-slate-600">{message}</p>}

        <div className="space-y-4">
          {questions.map((q) => (
            <DashboardCard key={q.id} title="Mother question">
              <p className="text-sm text-slate-700">{q.question}</p>
              {q.mother && (
                <div className="mt-2 rounded-lg bg-pink-50 p-3 text-xs text-pink-800">
                  <p>
                    {q.mother.name || q.mother.email} — {q.mother.weeksPregnant || "N/A"} weeks
                  </p>
                  <p>Conditions: {q.mother.conditions || "N/A"}</p>
                  <p>Medications: {q.mother.medications || "N/A"}</p>
                </div>
              )}
              <div className="mt-2 space-y-1">
                {q.prescriptions?.map((p) => (
                  <a
                    key={p.key}
                    className="text-xs text-pink-600 underline"
                    href={p.url}
                    target="_blank"
                  >
                    {p.key.split("/").pop()}
                  </a>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                {q.answer ? (
                  <p className="text-sm text-emerald-700">Answer: {q.answer}</p>
                ) : (
                  <>
                    <textarea
                      className="input h-20"
                      placeholder="Write a concise, supportive answer"
                      onBlur={(e) => submitAnswer(q.id, e.target.value)}
                    />
                    <p className="text-xs text-slate-500">
                      Tip: Click outside the box to submit.
                    </p>
                  </>
                )}
              </div>
            </DashboardCard>
          ))}
          {questions.length === 0 && (
            <p className="text-sm text-slate-500">No questions available yet.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

