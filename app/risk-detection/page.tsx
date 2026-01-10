"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getLanguage } from "@/lib/i18n";

type Question = {
  id: number;
  text: {
    en: string;
    bn: string;
  };
  answers: {
    yes: { en: string; bn: string };
    no: { en: string; bn: string };
  };
  category: string;
  weight: number;
  yesIncreasesRisk: boolean;
};

type Answer = {
  questionId: number;
  answer: "yes" | "no";
};

type RiskResult = {
  level: "low" | "medium" | "high";
  percentage: number;
  score: number;
  maxScore: number;
};

const DB_NAME = "risk-detection-db";
const DB_VERSION = 1;
const STORE_NAME = "answers";

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "questionId" });
      }
    };
  });
};

// Save answer to IndexedDB
const saveAnswer = async (questionId: number, answer: "yes" | "no") => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await store.put({ questionId, answer, timestamp: Date.now() });
  } catch (err) {
    console.error("Failed to save answer:", err);
  }
};

// Get saved answers from IndexedDB
const getSavedAnswers = async (): Promise<Record<number, "yes" | "no">> => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const answers: Record<number, "yes" | "no"> = {};
        request.result.forEach((item: Answer) => {
          answers[item.questionId] = item.answer;
        });
        resolve(answers);
      };
      request.onerror = () => resolve({});
    });
  } catch (err) {
    console.error("Failed to get saved answers:", err);
    return {};
  }
};

// Clear saved answers
const clearAnswers = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await store.clear();
  } catch (err) {
    console.error("Failed to clear answers:", err);
  }
};

// Calculate risk
const calculateRisk = (questions: Question[], answers: Answer[]): RiskResult => {
  let totalScore = 0;
  let maxScore = 0;

  questions.forEach((question) => {
    const answer = answers.find((a) => a.questionId === question.id);
    maxScore += question.weight;

    if (answer) {
      if (answer.answer === "yes" && question.yesIncreasesRisk) {
        totalScore += question.weight;
      } else if (answer.answer === "no" && !question.yesIncreasesRisk) {
        // If "no" increases risk, add weight
        totalScore += question.weight;
      }
    }
  });

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  let level: "low" | "medium" | "high";
  if (percentage >= 70) {
    level = "high";
  } else if (percentage >= 40) {
    level = "medium";
  } else {
    level = "low";
  }

  return { level, percentage, score: totalScore, maxScore };
};

export default function RiskDetectionPage() {
  const [lang] = useState(() => getLanguage());
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load questions
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const response = await fetch("/risk-questions.json");
        if (!response.ok) {
          throw new Error("Failed to load questions");
        }
        const data = await response.json();
        setQuestions(data.questions || []);

        // Always start fresh - don't resume from saved state
        // This allows users to take assessment multiple times
        const shuffled = [...data.questions].sort(() => Math.random() - 0.5);
        setSelectedQuestions(shuffled.slice(0, 10));
        // Clear any old answers
        await clearAnswers();
      } catch (err: any) {
        console.error("Error loading questions:", err);
        setError(
          lang === "bn"
            ? "প্রশ্ন লোড করতে ব্যর্থ হয়েছে। ইন্টারনেট সংযোগ পরীক্ষা করুন।"
            : "Failed to load questions. Please check your internet connection."
        );
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [lang]);

  const handleAnswer = async (answer: "yes" | "no") => {
    if (!selectedQuestions[currentIndex]) return;

    setSaving(true);
    const questionId = selectedQuestions[currentIndex].id;
    const newAnswer: Answer = { questionId, answer };

    // Save to IndexedDB
    await saveAnswer(questionId, answer);

    // Update answers
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    // Move to next question or show result
    if (currentIndex < selectedQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All questions answered
      const riskResult = calculateRisk(selectedQuestions, updatedAnswers);
      setResult(riskResult);
    }
    setSaving(false);
  };

  const handleRestart = async () => {
    await clearAnswers();
    setAnswers([]);
    setCurrentIndex(0);
    setResult(null);
    // Reshuffle questions for new assessment
    if (questions.length > 0) {
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      setSelectedQuestions(shuffled.slice(0, 10));
    }
  };

  const handleNewAssessment = async () => {
    await clearAnswers();
    setAnswers([]);
    setCurrentIndex(0);
    setResult(null);
    // Reshuffle questions for new assessment
    if (questions.length > 0) {
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      setSelectedQuestions(shuffled.slice(0, 10));
    }
  };

  const currentQuestion = selectedQuestions[currentIndex];
  const progress = ((currentIndex + 1) / selectedQuestions.length) * 100;

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">
            {lang === "bn" ? "প্রশ্ন লোড হচ্ছে..." : "Loading questions..."}
          </p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-4">
            {lang === "bn" ? "ত্রুটি" : "Error"}
          </h1>
          <p className="text-lg text-slate-600 mb-8">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            {lang === "bn" ? "পুনরায় চেষ্টা করুন" : "Try Again"}
          </button>
        </div>
      </Layout>
    );
  }

  if (result) {
    const riskColors = {
      low: "from-green-500 to-emerald-500",
      medium: "from-yellow-500 to-orange-500",
      high: "from-red-500 to-rose-500",
    };

    const riskLabels = {
      low: { en: "Low Risk", bn: "নিম্ন ঝুঁকি" },
      medium: { en: "Medium Risk", bn: "মধ্যম ঝুঁকি" },
      high: { en: "High Risk", bn: "উচ্চ ঝুঁকি" },
    };

    const riskMessages = {
      low: {
        en: "Your risk level is low. Continue regular check-ups and maintain a healthy lifestyle.",
        bn: "আপনার ঝুঁকির মাত্রা কম। নিয়মিত চেক-আপ চালিয়ে যান এবং স্বাস্থ্যকর জীবনযাপন বজায় রাখুন।",
      },
      medium: {
        en: "Your risk level is moderate. Please consult with your healthcare provider for personalized advice.",
        bn: "আপনার ঝুঁকির মাত্রা মধ্যম। ব্যক্তিগত পরামর্শের জন্য আপনার স্বাস্থ্যসেবা প্রদানকারীর সাথে পরামর্শ করুন।",
      },
      high: {
        en: "Your risk level is high. Please consult with your healthcare provider immediately for proper care.",
        bn: "আপনার ঝুঁকির মাত্রা বেশি। সঠিক যত্নের জন্য অবিলম্বে আপনার স্বাস্থ্যসেবা প্রদানকারীর সাথে পরামর্শ করুন।",
      },
    };

    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-6 px-4">
          <div className="text-center mb-6">
            <div className="mb-2">
              <h1 className="text-2xl font-bold text-slate-800 mb-1">
                Risk Assessment Result
              </h1>
              <h2 className="text-xl font-semibold text-slate-700">
                ঝুঁকি মূল্যায়ন ফলাফল
              </h2>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">
                Risk analysis based on your answers
              </p>
              <p className="text-sm text-slate-600">
                আপনার উত্তরগুলির উপর ভিত্তি করে ঝুঁকি বিশ্লেষণ
              </p>
            </div>
          </div>

           <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
             <div
               className={`bg-gradient-to-r ${riskColors[result.level]} rounded-lg p-6 text-white text-center mb-4`}
             >
               <div className="text-5xl font-bold mb-2">{result.percentage}%</div>
               <div className="text-xl font-semibold mb-1">
                 {riskLabels[result.level].en}
               </div>
               <div className="text-lg font-medium opacity-90">
                 {riskLabels[result.level].bn}
               </div>
             </div>

             <div className="space-y-3">
               <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                 <div>
                   <p className="text-xs text-slate-500 mb-1 uppercase font-semibold">English</p>
                   <p className="text-sm text-slate-700 leading-relaxed">
                     {riskMessages[result.level].en}
                   </p>
                 </div>
                 <div className="border-t border-slate-200 pt-2">
                   <p className="text-xs text-slate-500 mb-1 uppercase font-semibold">বাংলা</p>
                   <p className="text-sm text-slate-700 leading-relaxed">
                     {riskMessages[result.level].bn}
                   </p>
                 </div>
               </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-slate-600 mb-1">
                    {lang === "bn" ? "স্কোর" : "Score"}
                  </p>
                  <p className="text-xl font-bold text-blue-600">
                    {result.score} / {result.maxScore}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-slate-600 mb-1">
                    {lang === "bn" ? "প্রশ্ন উত্তর দেওয়া হয়েছে" : "Questions Answered"}
                  </p>
                  <p className="text-xl font-bold text-purple-600">
                    {answers.length} / {selectedQuestions.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <button onClick={handleNewAssessment} className="btn-primary text-sm py-2.5 px-6">
              {lang === "bn" ? "নতুন মূল্যায়ন করুন" : "Take New Assessment"}
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="btn-secondary text-sm py-2.5 px-6"
            >
              {lang === "bn" ? "হোমে ফিরুন" : "Back to Home"}
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-900">
              <strong>{lang === "bn" ? "দ্রষ্টব্য:" : "Note:"}</strong>{" "}
              {lang === "bn"
                ? "এটি একটি প্রাথমিক ঝুঁকি মূল্যায়ন সরঞ্জাম। এটি চিকিৎসা পরামর্শের বিকল্প নয়। গুরুতর লক্ষণ বা উদ্বেগের জন্য, অবিলম্বে একজন স্বাস্থ্যসেবা প্রদানকারীর সাথে পরামর্শ করুন।"
                : "This is a preliminary risk assessment tool. It is not a substitute for medical advice. For serious symptoms or concerns, please consult with a healthcare provider immediately."}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-4 px-4">
        <div className="mb-4">
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-slate-800 mb-1">
              Pregnancy Risk Assessment
            </h1>
            <h2 className="text-xl font-semibold text-slate-700">
              গর্ভাবস্থা ঝুঁকি মূল্যায়ন
            </h2>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-600">
              Answer 10 questions to assess your risk level
            </p>
            <p className="text-sm text-slate-600">
              ১০টি প্রশ্নের উত্তর দিন এবং আপনার ঝুঁকির মাত্রা জানুন
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-700">
              {lang === "bn" ? "অগ্রগতি" : "Progress"}
            </span>
            <span className="text-xs font-medium text-slate-700">
              {currentIndex + 1} / {selectedQuestions.length}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        {currentQuestion && (
          <div className="bg-white rounded-xl shadow-lg p-5 mb-4">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg font-bold mb-3">
                {currentIndex + 1}
              </div>
              {/* Show both English and Bangla */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1.5 uppercase font-semibold">English</p>
                  <h2 className="text-base font-semibold text-slate-800 leading-relaxed">
                    {currentQuestion.text.en}
                  </h2>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <p className="text-xs text-slate-500 mb-1.5 uppercase font-semibold">বাংলা</p>
                  <h2 className="text-base font-semibold text-slate-800 leading-relaxed">
                    {currentQuestion.text.bn}
                  </h2>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <button
                onClick={() => {
                  if (currentIndex > 0) {
                    setCurrentIndex(currentIndex - 1);
                  }
                }}
                disabled={currentIndex === 0 || saving}
                className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>←</span>
                <span>{lang === "bn" ? "পিছনে" : "Back"}</span>
              </button>
              <button
                onClick={() => {
                  const currentAnswer = answers.find(a => a.questionId === currentQuestion.id);
                  if (currentAnswer && currentIndex < selectedQuestions.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                  }
                }}
                disabled={!answers.find(a => a.questionId === currentQuestion.id) || currentIndex >= selectedQuestions.length - 1 || saving}
                className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{lang === "bn" ? "পরবর্তী" : "Next"}</span>
                <span>→</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleAnswer("yes")}
                disabled={saving}
                className="btn-primary text-base py-4 px-4 flex flex-col items-center justify-center gap-1.5 hover:scale-105 transition-transform disabled:opacity-50"
              >
                <span className="font-semibold text-sm">{currentQuestion.answers.yes.en}</span>
                <span className="text-xs opacity-90">{currentQuestion.answers.yes.bn}</span>
              </button>
              <button
                onClick={() => handleAnswer("no")}
                disabled={saving}
                className="btn-secondary text-base py-4 px-4 flex flex-col items-center justify-center gap-1.5 hover:scale-105 transition-transform disabled:opacity-50"
              >
                <span className="font-semibold text-sm">{currentQuestion.answers.no.en}</span>
                <span className="text-xs opacity-90">{currentQuestion.answers.no.bn}</span>
              </button>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-900">
            <strong>💡 {lang === "bn" ? "টিপ:" : "Tip:"}</strong>{" "}
            {lang === "bn"
              ? "এই সরঞ্জামটি সম্পূর্ণ অফলাইনে কাজ করে। আপনি যতবার চান ততবার মূল্যায়ন করতে পারেন।"
              : "This tool works completely offline. You can take the assessment as many times as you want."}
          </p>
        </div>
      </div>
    </Layout>
  );
}

