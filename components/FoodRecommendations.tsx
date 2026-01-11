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
  waterIntake?: string;
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
  exerciseVideos?: Array<{
    videoId: string;
    title: string;
    description: string;
    thumbnail: string;
    channelTitle: string;
    duration?: string;
    viewCount?: string;
    publishedAt?: string;
  }>;
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
  const [location, setLocation] = useState<any>(null);

  useEffect(() => {
    // Get current date - will be updated when API responds with timezone-aware date
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
    fetchRecommendation(today);
    
    // Update date every minute to catch midnight transitions
    // The API will return the correct date based on user's timezone
    const interval = setInterval(() => {
      const newDate = new Date().toISOString().split("T")[0];
      if (newDate !== selectedDate) {
        setSelectedDate(newDate);
        fetchRecommendation(newDate);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : undefined);

  const fetchRecommendation = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mother/daily-routine?date=${date}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendation(data.recommendation);
        setLocation(data.location);
      } else {
        const errorData = await res.json();
        console.error("Error fetching daily routine:", errorData);
        setRecommendation(null);
        setLocation(null);
      }
    } catch (err) {
      console.error("Error fetching daily routine:", err);
      setRecommendation(null);
      setLocation(null);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendation = async () => {
    // Prevent double-click/double-generation
    if (generating || loading) {
      console.log("[Daily Routine] Already generating, skipping...");
      return;
    }
    
    console.log("[Daily Routine] Starting recommendation generation...");
    setGenerating(true);
    setLoading(true);
    
    try {
      const res = await fetch("/api/mother/daily-routine", {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
      });
      
      console.log("[Daily Routine] API response status:", res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log("[Daily Routine] Received data:", {
          hasRecommendation: !!data.recommendation,
          hasLocation: !!data.location,
          date: data.recommendation?.date
        });
        
        if (data.recommendation) {
          setRecommendation(data.recommendation);
          setLocation(data.location);
          setSelectedDate(data.recommendation.date);
          console.log("[Daily Routine] ✅ Successfully set recommendation");
        } else {
          console.error("[Daily Routine] No recommendation in response");
          alert("Failed to generate recommendations. Please try again.");
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("[Daily Routine] API error:", errorData);
        alert(errorData.error || "Failed to generate recommendations");
      }
    } catch (err: any) {
      console.error("[Daily Routine] Error generating daily routine:", err);
      alert(`Network error: ${err.message || "Please try again."}`);
    } finally {
      setGenerating(false);
      setLoading(false);
      console.log("[Daily Routine] Generation complete");
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
    <div className="relative">
      {/* Fullscreen Loading Overlay - Fixed position to cover entire viewport */}
      {(generating || loading) && (
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 99999,
            backdropFilter: 'blur(4px)'
          }}
        >
          <div 
            className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl"
            style={{ zIndex: 100000 }}
          >
            <Icon name="pending" size={64} className="mx-auto mb-4 text-pink-500 animate-spin" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Generating Recommendations</h3>
            <p className="text-slate-600">
              Analyzing your health data, location, and preferences...
            </p>
            <p className="text-sm text-slate-500 mt-2">This may take a few moments</p>
          </div>
        </div>
      )}
      
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
              className="btn-secondary text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <p className="text-sm mb-4">Generate personalized exercise and food recommendations based on your pregnancy stage, health profile, allergies, medical conditions, detected location (IP-based), culture, climate, and all your health data.</p>
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
            {/* Exercise Recommendations - PRIMARY FOCUS */}
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
              
              {/* YouTube Exercise Videos - BELOW EXERCISES */}
              {recommendation.exerciseVideos && recommendation.exerciseVideos.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Icon name="view" size={18} />
                    Recommended Exercise Videos
                  </h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    {recommendation.exerciseVideos.map((video, idx) => (
                      <a
                        key={video.videoId}
                        href={`https://www.youtube.com/watch?v=${video.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group rounded-xl border-2 border-neutral-200 bg-white overflow-hidden hover:border-pink-300 hover:shadow-lg transition-all"
                      >
                        <div className="relative aspect-video bg-neutral-100 overflow-hidden" style={{ minHeight: '180px', position: 'relative' }}>
                          <img
                            src={(() => {
                              // Priority 1: Use API thumbnail if available
                              if (video.thumbnail && video.thumbnail.trim() !== '') {
                                console.log(`[Thumbnail] Using API thumbnail for ${video.videoId}:`, video.thumbnail);
                                return video.thumbnail;
                              }
                              // Priority 2: Construct URL if videoId exists
                              if (video.videoId && video.videoId.trim() !== '') {
                                const constructedUrl = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
                                console.log(`[Thumbnail] Using constructed URL for ${video.videoId}:`, constructedUrl);
                                return constructedUrl;
                              }
                              // Priority 3: Placeholder
                              console.warn(`[Thumbnail] No thumbnail or videoId for video:`, video);
                              return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect fill="%23ddd" width="320" height="180"/><text x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999">Video</text></svg>';
                            })()}
                            alt={video.title}
                            className="w-full h-full object-cover"
                            style={{ 
                              display: 'block',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              zIndex: 1,
                              backgroundColor: 'transparent'
                            }}
                            loading="lazy"
                            onError={(e) => {
                              // Try different YouTube thumbnail sizes
                              const target = e.target as HTMLImageElement;
                              console.error(`[Thumbnail] Error loading image:`, target.src);
                              if (!video.videoId || video.videoId.trim() === '') {
                                // No videoId, use placeholder
                                target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect fill="%23ddd" width="320" height="180"/><text x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999">Video</text></svg>';
                                return;
                              }
                              if (!target.src.includes('mqdefault')) {
                                target.src = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;
                                console.log(`[Thumbnail] Trying mqdefault for ${video.videoId}`);
                              } else if (!target.src.includes('sddefault')) {
                                target.src = `https://img.youtube.com/vi/${video.videoId}/sddefault.jpg`;
                                console.log(`[Thumbnail] Trying sddefault for ${video.videoId}`);
                              } else if (!target.src.includes('default')) {
                                target.src = `https://img.youtube.com/vi/${video.videoId}/default.jpg`;
                                console.log(`[Thumbnail] Trying default for ${video.videoId}`);
                              } else {
                                // Final fallback - placeholder
                                console.warn(`[Thumbnail] All attempts failed for ${video.videoId}, using placeholder`);
                                target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect fill="%23ddd" width="320" height="180"/><text x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999">Video</text></svg>';
                              }
                            }}
                            onLoad={(e) => {
                              const target = e.target as HTMLImageElement;
                              console.log(`[Thumbnail] Successfully loaded thumbnail for ${video.videoId}`, {
                                src: target.src,
                                naturalWidth: target.naturalWidth,
                                naturalHeight: target.naturalHeight,
                                clientWidth: target.clientWidth,
                                clientHeight: target.clientHeight,
                                display: window.getComputedStyle(target).display,
                                visibility: window.getComputedStyle(target).visibility,
                                opacity: window.getComputedStyle(target).opacity
                              });
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all pointer-events-none" style={{ zIndex: 10, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity pointer-events-auto">
                              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <h5 className="font-semibold text-slate-800 text-sm mb-2 line-clamp-2 group-hover:text-pink-600 transition-colors">
                            {video.title}
                          </h5>
                          <p className="text-xs text-slate-500 mb-2">{video.channelTitle}</p>
                          {video.viewCount && (
                            <p className="text-xs text-slate-400">
                              {parseInt(video.viewCount).toLocaleString()} views
                            </p>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Food Recommendations - Secondary */}
            <div className="mt-8">
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

            {recommendation.waterIntake && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Icon name="health" size={20} />
                  Water Intake Recommendations
                </h3>
                <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Icon name="health" size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800 text-lg mb-2">Stay Hydrated 💧</h4>
                      <p className="text-slate-700 leading-relaxed">{recommendation.waterIntake}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
    </div>
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
        
        {report.foodAnalysis.benefits.length > 0 && (
          <div className="mb-3">
            <p className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
              <span>✅</span>
              <span>Future Benefits from What You Ate:</span>
            </p>
            <ul className="text-sm text-green-700 ml-4 list-disc space-y-1">
              {report.foodAnalysis.benefits.map((benefit, idx) => (
                <li key={idx} className="leading-relaxed">{benefit}</li>
              ))}
            </ul>
          </div>
        )}

        {report.foodAnalysis.negativeImpacts.length > 0 && (
          <div>
            <p className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
              <span>⚠️</span>
              <span>Potential Negative Consequences from What You Didn't Eat:</span>
            </p>
            <ul className="text-sm text-red-700 ml-4 list-disc space-y-1">
              {report.foodAnalysis.negativeImpacts.map((impact, idx) => (
                <li key={idx} className="leading-relaxed">{impact}</li>
              ))}
            </ul>
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
            {report.exerciseAnalysis.benefits && report.exerciseAnalysis.benefits.length > 0 && (
              <div>
                <p className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                  <span>✅</span>
                  <span>Future Benefits from Exercises You Did:</span>
                </p>
                <ul className="text-sm text-green-700 ml-4 list-disc space-y-1">
                  {report.exerciseAnalysis.benefits.map((benefit, idx) => (
                    <li key={idx} className="leading-relaxed">{benefit}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div>
            {report.exerciseAnalysis.negativeImpacts && report.exerciseAnalysis.negativeImpacts.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Potential Negative Consequences from Not Doing Exercises:</span>
                </p>
                <ul className="text-sm text-red-700 ml-4 list-disc space-y-1">
                  {report.exerciseAnalysis.negativeImpacts.map((impact, idx) => (
                    <li key={idx} className="leading-relaxed">{impact}</li>
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

