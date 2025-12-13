"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import MessagePopup from "./MessagePopup";

type Question = {
  id: string;
  question_en: string;
  question_bn: string;
  category?: string;
  answer: "yes" | "no" | null;
};

type Session = {
  id: string;
  date: string;
  answeredCount: number;
  totalQuestions: number;
  completed: boolean;
  earlyProblems: string[];
};

type Props = {
  token: string;
  onComplete: () => void;
};

export default function DailyQuestionPopup({ token, onComplete }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showCompletion, setShowCompletion] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/mother/daily-questions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        
        // Only proceed if shouldShow is true and there are questions
        if (!data.shouldShow || !data.questions || data.questions.length === 0) {
          // Not time to show questions or no questions available - don't show popup
          setLoading(false);
          return;
        }
        
        setQuestions(data.questions || []);
        setSession(data.session);

        // Find first unanswered question
        const firstUnanswered = data.questions.findIndex((q: Question) => !q.answer);
        if (firstUnanswered >= 0) {
          setCurrentIndex(firstUnanswered);
        } else if (data.session && data.session.completed) {
          setShowCompletion(true);
        }
      } else {
        setError("Failed to load questions");
      }
    } catch (err) {
      setError("Failed to load questions");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (answer: "yes" | "no") => {
    if (!questions[currentIndex] || submitting) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/mother/daily-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionId: questions[currentIndex].id,
          answer,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Update local state
        const updatedQuestions = [...questions];
        updatedQuestions[currentIndex].answer = answer;
        setQuestions(updatedQuestions);
        setSession(data.session);

        // Move to next unanswered question
        const nextUnanswered = updatedQuestions.findIndex((q, idx) => idx > currentIndex && !q.answer);
        
        if (nextUnanswered >= 0) {
          setCurrentIndex(nextUnanswered);
        } else if (data.session.completed) {
          // All questions answered
          setShowCompletion(true);
        } else {
          // Find any unanswered question
          const anyUnanswered = updatedQuestions.findIndex(q => !q.answer);
          if (anyUnanswered >= 0) {
            setCurrentIndex(anyUnanswered);
          } else {
            setShowCompletion(true);
          }
        }
      } else {
        setError("Failed to submit answer. Please try again.");
      }
    } catch (err) {
      setError("Failed to submit answer. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = () => {
    setShowCompletion(false);
    onComplete();
  };

  // Don't show loading state - check happens in background
  if (loading) {
    return null;
  }

  if (showCompletion && session) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="check" className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">All Questions Completed!</h2>
            <p className="text-slate-600 mb-4">
              You've answered all {session.totalQuestions} questions for today.
            </p>
            
            {session.earlyProblems && session.earlyProblems.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
                <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                  <Icon name="warning" className="w-5 h-5 text-yellow-600" />
                  Early Detection Alerts:
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 mb-3">
                  {session.earlyProblems.map((problem, idx) => (
                    <li key={idx}>{problem}</li>
                  ))}
                </ul>
                {(session as any).earlyProblemRecommendation && (
                  <div className="mt-3 pt-3 border-t border-yellow-300">
                    <p className="text-sm font-medium text-yellow-800 mb-1">Recommendation:</p>
                    <p className="text-sm text-yellow-700">{(session as any).earlyProblemRecommendation}</p>
                  </div>
                )}
              </div>
            )}
            {(!session.earlyProblems || session.earlyProblems.length === 0) && (session as any).earlyProblemRecommendation && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-left">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <Icon name="check" className="w-5 h-5 text-green-600" />
                  Health Status:
                </h3>
                <p className="text-sm text-green-700">{(session as any).earlyProblemRecommendation}</p>
              </div>
            )}

            <button
              onClick={handleComplete}
              className="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 transition-colors"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session || questions.length === 0) {
    return null;
  }

  const currentQuestion = questions[currentIndex];
  const progress = session.totalQuestions > 0 
    ? Math.round((session.answeredCount / session.totalQuestions) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-slate-800">Daily Health Questions</h2>
            <span className="text-sm text-slate-600">
              {session.answeredCount} / {session.totalQuestions} answered
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className="bg-pink-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
            <button
              onClick={() => setError("")}
              className="float-right text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Question */}
        {currentQuestion && (
          <div className="mb-6">
            <div className="bg-slate-50 rounded-lg p-6 mb-6">
              <p className="text-lg font-semibold text-slate-800 mb-2">
                {currentQuestion.question_en}
                {currentQuestion.question_bn && (
                  <span className="block mt-2 text-base font-normal text-slate-600">
                    ({currentQuestion.question_bn})
                  </span>
                )}
              </p>
              {currentQuestion.category && (
                <span className="inline-block bg-pink-100 text-pink-700 text-xs px-2 py-1 rounded mt-2">
                  {currentQuestion.category}
                </span>
              )}
            </div>

            {/* Answer Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => submitAnswer("yes")}
                disabled={submitting}
                className={`py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
                  currentQuestion.answer === "yes"
                    ? "bg-green-600 text-white"
                    : "bg-green-50 text-green-700 hover:bg-green-100 border-2 border-green-300"
                } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Yes
              </button>
              <button
                onClick={() => submitAnswer("no")}
                disabled={submitting}
                className={`py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
                  currentQuestion.answer === "no"
                    ? "bg-red-600 text-white"
                    : "bg-red-50 text-red-700 hover:bg-red-100 border-2 border-red-300"
                } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                No
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-4 border-t">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0 || submitting}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-sm text-slate-500">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <button
            onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
            disabled={currentIndex === questions.length - 1 || submitting}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

