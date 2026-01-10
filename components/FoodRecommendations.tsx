"use client";

import { useState, useEffect } from "react";
import DashboardCard from "./DashboardCard";
import Icon from "./Icon";
import { useTranslation } from "@/hooks/useTranslation";

type DailyRoutine = {
  id: string;
  date: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  exercises: string;
  breakfastEaten?: boolean;
  lunchEaten?: boolean;
  dinnerEaten?: boolean;
  exercisesDone?: boolean;
  breakfastEatenAt?: string;
  lunchEatenAt?: string;
  dinnerEatenAt?: string;
  exercisesDoneAt?: string;
  dailyReport?: {
    id: string;
    date: string;
    foodAnalysis: {
      eaten: string[];
      notEaten: string[];
      benefits: string[];
      negativeImpacts: string[];
      status: "good" | "moderate" | "poor";
    };
    exerciseAnalysis: {
      done: boolean;
      benefits?: string[];
      negativeImpacts?: string[];
      status: "good" | "moderate" | "poor";
    };
    overallStatus: "good" | "moderate" | "poor";
    createdAt: string;
  };
};

type Props = {
  token: string;
  motherId: string;
};

export default function FoodRecommendations({ token, motherId }: Props) {
  const t = useTranslation();
  const [recommendation, setRecommendation] = useState<DailyRoutine | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
    fetchRecommendation(today);
  }, []);

  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : undefined);

  const fetchRecommendation = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mother/food-recommendations?date=${date}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendation(data.recommendation);
      } else {
        const errorData = await res.json();
        console.error("Error fetching food recommendations:", errorData);
        setRecommendation(null);
      }
    } catch (err) {
      console.error("Error fetching food recommendations:", err);
      setRecommendation(null);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendation = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/mother/food-recommendations", {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendation(data.recommendation);
        setSelectedDate(data.recommendation.date);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to generate recommendations");
      }
    } catch (err) {
      console.error("Error generating food recommendations:", err);
      alert("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const toggleMeal = async (meal: "breakfast" | "lunch" | "dinner" | "exercises") => {
    if (!recommendation) return;
    
    let currentValue: boolean | undefined;
    if (meal === "exercises") {
      currentValue = recommendation.exercisesDone;
    } else {
      currentValue = recommendation[`${meal}Eaten` as keyof DailyRoutine] as boolean | undefined;
    }
    const newValue = !currentValue;
    
    setUpdating(meal);
    try {
      const res = await fetch("/api/mother/food-tracking", {
        method: "PUT",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meal,
          eaten: newValue,
          date: recommendation.date,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setRecommendation(data.recommendation);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to update food tracking");
      }
    } catch (err) {
      console.error("Error updating food tracking:", err);
      alert("Network error. Please try again.");
    } finally {
      setUpdating(null);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    fetchRecommendation(newDate);
  };

  const MealCard = ({ 
    meal, 
    content, 
    done, 
    doneAt,
    isExercise = false
  }: { 
    meal: "breakfast" | "lunch" | "dinner" | "exercises";
    content: string;
    done?: boolean;
    doneAt?: string;
    isExercise?: boolean;
  }) => {
    const mealLabels = {
      breakfast: "Breakfast",
      lunch: "Lunch",
      dinner: "Dinner",
      exercises: "Exercises",
    };

    const mealIcons = {
      breakfast: "morning",
      lunch: "health",
      dinner: "evening",
      exercises: "progress",
    };

    const isUpdating = updating === meal;

    return (
      <div className="rounded-xl border-2 border-neutral-200 bg-white p-5 hover:shadow-md transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Icon name={mealIcons[meal]} size={24} className="text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-lg">{mealLabels[meal]}</h4>
                {done && doneAt && (
                  <p className="text-xs text-green-600 mt-0.5">
                    {isExercise ? "Done" : "Eaten"} at {new Date(doneAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
            <p className="text-slate-700 mb-4 leading-relaxed">{content}</p>
            <button
              onClick={() => toggleMeal(meal)}
              disabled={isUpdating || loading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                done
                  ? "bg-green-50 text-green-700 border-2 border-green-300 hover:bg-green-100"
                  : "bg-slate-50 text-slate-700 border-2 border-slate-300 hover:bg-slate-100"
              } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isUpdating ? (
                <>
                  <Icon name="pending" size={18} />
                  Updating...
                </>
              ) : done ? (
                <>
                  <Icon name="success" size={18} />
                  {isExercise ? "Mark as Not Done" : "Mark as Not Eaten"}
                </>
              ) : (
                <>
                  <Icon name="save" size={18} />
                  {isExercise ? "Mark as Done" : "Mark as Eaten"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const today = new Date().toISOString().split("T")[0];
  const isToday = recommendation?.date === today;
  const eatenCount = [
    recommendation?.breakfastEaten,
    recommendation?.lunchEaten,
    recommendation?.dinnerEaten,
  ].filter(Boolean).length;
  const exercisesDone = recommendation?.exercisesDone || false;

  return (
    <DashboardCard
      title={
        <span className="flex items-center gap-2">
          <Icon name="health" size={20} />
          Daily Routine
        </span>
      }
      action={
        <div className="flex items-center gap-2">
          {isToday && eatenCount > 0 && (
            <span className="text-sm text-green-600 font-medium">
              {eatenCount}/3 meals eaten today
            </span>
          )}
          <button
            onClick={generateRecommendation}
            disabled={generating || loading}
            className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
          >
            {generating ? (
              <>
                <Icon name="pending" size={16} />
                Generating...
              </>
            ) : (
              <>
                <Icon name="sync" size={16} />
                Refresh
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select Date
          </label>
          <input
            type="date"
            className="input w-full"
            value={selectedDate}
            onChange={handleDateChange}
            max={today}
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Icon name="pending" size={48} className="mx-auto mb-3 text-slate-300 animate-spin" />
            <p className="text-slate-500">Loading daily routine...</p>
          </div>
        ) : !recommendation ? (
          <div className="text-center py-12 text-slate-500 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
            <Icon name="health" size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-lg font-medium mb-2">No daily routine for this date</p>
            <p className="text-sm mb-4">Generate personalized food and exercise recommendations based on your pregnancy stage, health profile, allergies, and medical conditions.</p>
            <button
              onClick={generateRecommendation}
              disabled={generating}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              {generating ? (
                <>
                  <Icon name="pending" size={18} />
                  Generating...
                </>
              ) : (
                <>
                  <Icon name="health" size={18} />
                  Generate Recommendations
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-gradient-to-br from-orange-50 to-pink-50 p-4 border-2 border-orange-200">
              <p className="text-sm text-slate-700 flex items-start gap-2">
                <Icon name="info" size={16} className="mt-0.5 flex-shrink-0" />
                <span>
                  <strong>AI-Powered Recommendations:</strong> These food and exercise suggestions are personalized based on your pregnancy stage, 
                  medical conditions, allergies, location, chat history, prescriptions, and recent health journal entries. All recommendations are medically validated.
                </span>
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Icon name="health" size={20} />
                Food Recommendations
              </h3>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <MealCard
                  meal="breakfast"
                  content={recommendation.breakfast}
                  done={recommendation.breakfastEaten}
                  doneAt={recommendation.breakfastEatenAt}
                />
                <MealCard
                  meal="lunch"
                  content={recommendation.lunch}
                  done={recommendation.lunchEaten}
                  doneAt={recommendation.lunchEatenAt}
                />
                <MealCard
                  meal="dinner"
                  content={recommendation.dinner}
                  done={recommendation.dinnerEaten}
                  doneAt={recommendation.dinnerEatenAt}
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Icon name="progress" size={20} />
                Exercise Recommendations
              </h3>
              <div className="mb-6">
                <MealCard
                  meal="exercises"
                  content={recommendation.exercises}
                  done={recommendation.exercisesDone}
                  doneAt={recommendation.exercisesDoneAt}
                  isExercise={true}
                />
              </div>
            </div>

            {recommendation.dailyReport && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Icon name="info" size={20} />
                  Daily Report
                </h3>
                <DailyReportDisplay report={recommendation.dailyReport} />
              </div>
            )}

            {isToday && eatenCount === 3 && exercisesDone && (
              <div className="rounded-xl bg-green-50 border-2 border-green-200 p-4">
                <p className="text-green-700 font-medium flex items-center gap-2">
                  <Icon name="success" size={20} />
                  Great job! You've completed all meals and exercises for today. Keep up the healthy routine! 🎉
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardCard>
  );
}

function DailyReportDisplay({ report }: { report: DailyRoutine["dailyReport"] }) {
  if (!report) return null;

  const getStatusIcon = (status: "good" | "moderate" | "poor") => {
    if (status === "good") {
      return <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
        <span className="text-white text-xs">✓</span>
      </div>;
    } else if (status === "moderate") {
      return <div className="w-5 h-5 rounded-full bg-yellow-600 flex items-center justify-center">
        <span className="text-white text-xs">!</span>
      </div>;
    } else {
      return <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center">
        <span className="text-white text-xs">✗</span>
      </div>;
    }
  };

  const getStatusColor = (status: "good" | "moderate" | "poor") => {
    if (status === "good") return "bg-green-50 border-green-200";
    if (status === "moderate") return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <div className="space-y-4">
      {/* Food Analysis */}
      <div className={`rounded-xl border-2 p-4 ${getStatusColor(report.foodAnalysis.status)}`}>
        <div className="flex items-center gap-2 mb-3">
          {getStatusIcon(report.foodAnalysis.status)}
          <h4 className="font-semibold text-slate-800">Food Analysis</h4>
        </div>
        
        {report.foodAnalysis.eaten.length > 0 && (
          <div className="mb-3">
            <p className="text-sm font-medium text-slate-700 mb-2">✅ Meals Eaten:</p>
            <ul className="text-sm text-slate-600 ml-4 list-disc">
              {report.foodAnalysis.eaten.map((meal, idx) => (
                <li key={idx}>{meal}</li>
              ))}
            </ul>
            {report.foodAnalysis.benefits.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-green-700 mb-1">Benefits:</p>
                <ul className="text-sm text-green-600 ml-4 list-disc">
                  {report.foodAnalysis.benefits.map((benefit, idx) => (
                    <li key={idx}>{benefit}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {report.foodAnalysis.notEaten.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">❌ Meals Not Eaten:</p>
            <ul className="text-sm text-slate-600 ml-4 list-disc">
              {report.foodAnalysis.notEaten.map((meal, idx) => (
                <li key={idx}>{meal}</li>
              ))}
            </ul>
            {report.foodAnalysis.negativeImpacts.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-red-700 mb-1">Potential Impacts:</p>
                <ul className="text-sm text-red-600 ml-4 list-disc">
                  {report.foodAnalysis.negativeImpacts.map((impact, idx) => (
                    <li key={idx}>{impact}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Exercise Analysis */}
      <div className={`rounded-xl border-2 p-4 ${getStatusColor(report.exerciseAnalysis.status)}`}>
        <div className="flex items-center gap-2 mb-3">
          {getStatusIcon(report.exerciseAnalysis.status)}
          <h4 className="font-semibold text-slate-800">Exercise Analysis</h4>
        </div>
        
        {report.exerciseAnalysis.done ? (
          <div>
            <p className="text-sm font-medium text-green-700 mb-2">✅ Exercises Completed</p>
            {report.exerciseAnalysis.benefits && report.exerciseAnalysis.benefits.length > 0 && (
              <div>
                <p className="text-sm font-medium text-green-700 mb-1">Benefits:</p>
                <ul className="text-sm text-green-600 ml-4 list-disc">
                  {report.exerciseAnalysis.benefits.map((benefit, idx) => (
                    <li key={idx}>{benefit}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-red-700 mb-2">❌ Exercises Not Completed</p>
            {report.exerciseAnalysis.negativeImpacts && report.exerciseAnalysis.negativeImpacts.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-700 mb-1">Potential Impacts:</p>
                <ul className="text-sm text-red-600 ml-4 list-disc">
                  {report.exerciseAnalysis.negativeImpacts.map((impact, idx) => (
                    <li key={idx}>{impact}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overall Status */}
      <div className={`rounded-xl border-2 p-4 ${getStatusColor(report.overallStatus)}`}>
        <div className="flex items-center gap-2">
          {getStatusIcon(report.overallStatus)}
          <h4 className="font-semibold text-slate-800">Overall Daily Routine Status: {
            report.overallStatus === "good" ? "Good" : 
            report.overallStatus === "moderate" ? "Moderate" : "Needs Improvement"
          }</h4>
        </div>
      </div>
    </div>
  );
}

