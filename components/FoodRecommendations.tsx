"use client";

import { useState, useEffect } from "react";
import DashboardCard from "./DashboardCard";
import Icon from "./Icon";
import { useTranslation } from "@/hooks/useTranslation";

type FoodRecommendation = {
  id: string;
  date: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  breakfastEaten?: boolean;
  lunchEaten?: boolean;
  dinnerEaten?: boolean;
  breakfastEatenAt?: string;
  lunchEatenAt?: string;
  dinnerEatenAt?: string;
};

type Props = {
  token: string;
  motherId: string;
};

export default function FoodRecommendations({ token, motherId }: Props) {
  const t = useTranslation();
  const [recommendation, setRecommendation] = useState<FoodRecommendation | null>(null);
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

  const toggleMeal = async (meal: "breakfast" | "lunch" | "dinner") => {
    if (!recommendation) return;
    
    const currentValue = recommendation[`${meal}Eaten` as keyof FoodRecommendation] as boolean | undefined;
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
    food, 
    eaten, 
    eatenAt 
  }: { 
    meal: "breakfast" | "lunch" | "dinner";
    food: string;
    eaten?: boolean;
    eatenAt?: string;
  }) => {
    const mealLabels = {
      breakfast: "Breakfast",
      lunch: "Lunch",
      dinner: "Dinner",
    };

    const mealIcons = {
      breakfast: "morning",
      lunch: "health",
      dinner: "evening",
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
                {eaten && eatenAt && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Eaten at {new Date(eatenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
            <p className="text-slate-700 mb-4 leading-relaxed">{food}</p>
            <button
              onClick={() => toggleMeal(meal)}
              disabled={isUpdating || loading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                eaten
                  ? "bg-green-50 text-green-700 border-2 border-green-300 hover:bg-green-100"
                  : "bg-slate-50 text-slate-700 border-2 border-slate-300 hover:bg-slate-100"
              } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isUpdating ? (
                <>
                  <Icon name="pending" size={18} />
                  Updating...
                </>
              ) : eaten ? (
                <>
                  <Icon name="success" size={18} />
                  Mark as Not Eaten
                </>
              ) : (
                <>
                  <Icon name="save" size={18} />
                  Mark as Eaten
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

  return (
    <DashboardCard
      title={
        <span className="flex items-center gap-2">
          <Icon name="health" size={20} />
          Daily Food Recommendations
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
            <p className="text-slate-500">Loading food recommendations...</p>
          </div>
        ) : !recommendation ? (
          <div className="text-center py-12 text-slate-500 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
            <Icon name="health" size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-lg font-medium mb-2">No food recommendations for this date</p>
            <p className="text-sm mb-4">Generate personalized food recommendations based on your pregnancy stage and health profile.</p>
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
                  <strong>AI-Powered Recommendations:</strong> These food suggestions are personalized based on your pregnancy stage, 
                  medical conditions, allergies, and recent health journal entries. Mark meals as eaten to track your nutrition.
                </span>
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <MealCard
                meal="breakfast"
                food={recommendation.breakfast}
                eaten={recommendation.breakfastEaten}
                eatenAt={recommendation.breakfastEatenAt}
              />
              <MealCard
                meal="lunch"
                food={recommendation.lunch}
                eaten={recommendation.lunchEaten}
                eatenAt={recommendation.lunchEatenAt}
              />
              <MealCard
                meal="dinner"
                food={recommendation.dinner}
                eaten={recommendation.dinnerEaten}
                eatenAt={recommendation.dinnerEatenAt}
              />
            </div>

            {isToday && eatenCount === 3 && (
              <div className="rounded-xl bg-green-50 border-2 border-green-200 p-4">
                <p className="text-green-700 font-medium flex items-center gap-2">
                  <Icon name="success" size={20} />
                  Great job! You've tracked all three meals for today. Keep up the healthy eating! 🎉
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardCard>
  );
}

