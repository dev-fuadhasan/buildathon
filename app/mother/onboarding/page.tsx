"use client";

import Layout from "@/components/Layout";
import Icon from "@/components/Icon";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLanguage } from "@/lib/i18n";

type OnboardingData = {
  age: number;
  pregnancyStatus: string;
  gestationalWeek?: number;
  previousPregnancies: number;
  riskConditions: string[];
  locationType: string;
};

export default function MotherOnboarding() {
  const router = useRouter();
  const [lang] = useState(() => getLanguage());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState<OnboardingData>({
    age: 0,
    pregnancyStatus: "",
    gestationalWeek: undefined,
    previousPregnancies: 0,
    riskConditions: [],
    locationType: "",
  });

  // Check if user is logged in
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthToken = urlParams.get('token');
    const isOAuth = urlParams.get('oauth') === 'true';
    
    let token: string;
    if (oauthToken && isOAuth) {
      localStorage.setItem("motherToken", oauthToken);
      token = oauthToken;
      window.history.replaceState({}, '', '/mother/onboarding');
    } else {
      token = localStorage.getItem("motherToken") || "";
    }
    
    if (!token) {
      router.push("/mother/login");
      return;
    }

    checkProfileComplete(token);
  }, [router]);

  const checkProfileComplete = async (token: string) => {
    try {
      const res = await fetch("/api/mother/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const profile = data.profile;
        if (profile.onboardingComplete || profile.age) {
          router.push("/mother/dashboard");
        }
      }
    } catch (err) {
      console.error("Error checking profile:", err);
    }
  };

  const nextStep = () => {
    // Validation for current step
    if (step === 1) {
      if (!formData.age || formData.age < 18 || formData.age > 50) {
        setError(lang === "bn" ? "আপনার বয়স লিখুন (১৮-৫০ বছর)" : "Please enter your age (18-50 years)");
        return;
      }
      if (!formData.locationType) {
        setError(lang === "bn" ? "অবস্থানের ধরন নির্বাচন করুন" : "Please select your location type");
        return;
      }
    } else if (step === 2) {
      if (!formData.pregnancyStatus) {
        setError(lang === "bn" ? "গর্ভাবস্থার অবস্থা নির্বাচন করুন" : "Please select your pregnancy status");
        return;
      }
      if (formData.pregnancyStatus === "pregnant" && !formData.gestationalWeek) {
        setError(lang === "bn" ? "গর্ভাবস্থার সপ্তাহ লিখুন" : "Please enter your gestational week");
        return;
      }
    }
    
    setError("");
    setStep(prev => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => {
    setError("");
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < totalSteps) {
      nextStep();
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("motherToken");
      if (!token) {
        router.push("/mother/login");
        return;
      }

      let daysPregnant: number | undefined;
      if (formData.pregnancyStatus === "pregnant" && formData.gestationalWeek) {
        daysPregnant = formData.gestationalWeek * 7;
      }

      const conditionsString = formData.riskConditions.length > 0
        ? formData.riskConditions.join(", ")
        : "";

      const updateData: any = {
        age: formData.age,
        pregnancyStatus: formData.pregnancyStatus,
        previousPregnancies: formData.previousPregnancies,
        conditions: conditionsString,
        area: formData.locationType,
        onboardingComplete: true,
      };

      if (daysPregnant) {
        updateData.daysPregnant = daysPregnant;
        updateData.weeksPregnant = formData.gestationalWeek;
      }

      const res = await fetch("/api/mother/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }

      localStorage.setItem("motherOnboardingComplete", "true");
      router.push("/mother/dashboard");
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const toggleRiskCondition = (condition: string) => {
    setFormData((prev) => {
      if (prev.riskConditions.includes(condition)) {
        return {
          ...prev,
          riskConditions: prev.riskConditions.filter((c) => c !== condition),
        };
      } else {
        return {
          ...prev,
          riskConditions: [...prev.riskConditions, condition],
        };
      }
    });
  };

  return (
    <Layout>
      <div className="flex-1 flex flex-col justify-center py-8 sm:py-12 px-4 animate-in fade-in duration-700 min-h-screen">
        <div className="mx-auto w-full max-w-xl">
          
          {/* Progress Indicator */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-pink-500 bg-pink-50 px-3 py-1.5 rounded-full border border-pink-100 shadow-sm shadow-pink-50">
                {lang === "bn" ? `ধাপ ${step} এর ${totalSteps}` : `Step ${step} of ${totalSteps}`}
              </span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map(s => (
                  <div 
                    key={s} 
                    className={`h-1.5 w-6 rounded-full transition-all duration-500 ${
                      s <= step ? "bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.4)]" : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="relative h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-pink-500 to-rose-600 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(236,72,153,0.3)]"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Header */}
          <div className="text-center space-y-3 mb-8">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {step === 1 && (lang === "bn" ? "চলুন শুরু করি" : "Let's Get Started")}
              {step === 2 && (lang === "bn" ? "আপনার গর্ভাবস্থা" : "Your Pregnancy")}
              {step === 3 && (lang === "bn" ? "স্বাস্থ্য ইতিহাস" : "Health History")}
              {step === 4 && (lang === "bn" ? "সবকিছু ঠিক আছে?" : "Ready to Go?")}
            </h1>
            <p className="text-slate-500 font-medium leading-relaxed text-sm sm:text-base max-w-sm mx-auto">
              {step === 1 && (lang === "bn" ? "আপনার সম্পর্কে কিছু প্রাথমিক তথ্য দিন।" : "Tell us a bit about yourself so we can personalize your experience.")}
              {step === 2 && (lang === "bn" ? "আপনার বর্তমান গর্ভাবস্থার অবস্থা জানতে দিন।" : "Let us know about your current pregnancy status.")}
              {step === 3 && (lang === "bn" ? "আপনার স্বাস্থ্যের ইতিহাস আমাদের ভালো সেবা দিতে সাহায্য করবে।" : "Knowing your health history helps us provide better care.")}
              {step === 4 && (lang === "bn" ? "সবশেষে একবার দেখে নিন এবং যাত্রা শুরু করুন।" : "Review and complete to start your caring journey with MomsCare AI.")}
            </p>
          </div>

          {/* Card Container */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-100 via-rose-50 to-pink-100 rounded-[2.5rem] blur-xl opacity-40 group-hover:opacity-60 transition duration-1000"></div>
            
            <form onSubmit={handleSubmit} className="relative bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-10 shadow-[0_20px_50px_rgba(236,72,153,0.06)] border border-pink-50/50 space-y-8 overflow-hidden min-h-[400px] flex flex-col">
              
              <div className="flex-1 space-y-8 relative z-10 animate-in slide-in-from-right-4 duration-500">
                
                {/* Step 1: About You */}
                {step === 1 && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="group/input">
                      <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-1 group-focus-within/input:text-pink-500 transition-colors">
                        {lang === "bn" ? "আপনার বয়স" : "Your Age"} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-pink-500 transition-all duration-300">
                          <Icon name="profile" size={20} />
                        </div>
                        <input
                          className="w-full bg-slate-50 border-2 border-slate-100/80 rounded-2xl py-4 pl-14 pr-6 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-pink-200 focus:ring-[6px] focus:ring-pink-50 outline-none transition-all duration-300 font-bold"
                          type="number"
                          min="18"
                          max="50"
                          placeholder={lang === "bn" ? "যেমন: ২৫" : "e.g., 25"}
                          value={formData.age || ""}
                          onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="group/input">
                      <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-1 group-focus-within/input:text-pink-500 transition-colors">
                        {lang === "bn" ? "অবস্থানের ধরন" : "Location Type"} <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { value: "urban", label: lang === "bn" ? "শহুরে (শহুর এলাকায়)" : "Urban (City Area)", icon: "clinic" },
                          { value: "semi_rural", label: lang === "bn" ? "আধা-গ্রামীণ" : "Semi-Rural", icon: "health" },
                          { value: "rural", label: lang === "bn" ? "গ্রামীণ (গ্রাম এলাকায়)" : "Rural (Village Area)", icon: "baby" },
                        ].map((location) => (
                          <button
                            key={location.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, locationType: location.value })}
                            className={`group/opt relative py-4 px-6 rounded-2xl border-2 font-bold text-sm transition-all text-left flex items-center gap-4 ${
                              formData.locationType === location.value
                                ? "bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-200"
                                : "bg-slate-50 text-slate-600 border-slate-100/80 hover:border-pink-200 hover:bg-pink-50/50"
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                              formData.locationType === location.value ? "bg-white/20" : "bg-white shadow-sm group-hover/opt:bg-pink-100"
                            }`}>
                              <Icon name={location.icon as any} size={20} className={formData.locationType === location.value ? "text-white" : "text-slate-400"} />
                            </div>
                            <span>{location.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Pregnancy Status */}
                {step === 2 && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="group/input">
                      <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-1 group-focus-within/input:text-pink-500 transition-colors">
                        {lang === "bn" ? "বর্তমান অবস্থা" : "Current Status"} <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-3">
                        {[
                          { value: "not_pregnant", label: lang === "bn" ? "গর্ভবতী নই" : "Not Pregnant", icon: "profile" },
                          { value: "pregnant", label: lang === "bn" ? "আমি গর্ভবতী" : "I am Pregnant", icon: "mom" },
                          { value: "recently_delivered", label: lang === "bn" ? "সম্প্রতি সন্তান হয়েছে" : "Recently Delivered", icon: "baby" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, pregnancyStatus: option.value, gestationalWeek: option.value !== "pregnant" ? undefined : formData.gestationalWeek })}
                            className={`group/opt relative py-4 px-6 rounded-2xl border-2 font-bold text-sm transition-all text-left flex items-center gap-4 ${
                              formData.pregnancyStatus === option.value
                                ? "bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-200"
                                : "bg-slate-50 text-slate-600 border-slate-100/80 hover:border-pink-200 hover:bg-pink-50/50"
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                              formData.pregnancyStatus === option.value ? "bg-white/20" : "bg-white shadow-sm group-hover/opt:bg-pink-100"
                            }`}>
                              <Icon name={option.icon as any} size={20} className={formData.pregnancyStatus === option.value ? "text-white" : "text-slate-400"} />
                            </div>
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {formData.pregnancyStatus === "pregnant" && (
                      <div className="group/input animate-in slide-in-from-top-4 duration-500 bg-pink-50/30 p-6 rounded-3xl border border-pink-100/50">
                        <label className="block text-xs font-black uppercase tracking-[0.2em] text-pink-500 mb-3 ml-1">
                          {lang === "bn" ? "কততম সপ্তাহ?" : "Which Week?"} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-pink-300 group-focus-within/input:text-pink-500 transition-all duration-300">
                            <Icon name="progress" size={20} />
                          </div>
                          <input
                            className="w-full bg-white border-2 border-pink-100/80 rounded-2xl py-4 pl-14 pr-6 text-slate-900 placeholder:text-pink-200 focus:border-pink-300 focus:ring-4 focus:ring-pink-100/50 outline-none transition-all duration-300 font-bold"
                            type="number"
                            min="1"
                            max="42"
                            placeholder={lang === "bn" ? "যেমন: ২০" : "e.g., 20"}
                            value={formData.gestationalWeek || ""}
                            onChange={(e) => setFormData({ ...formData, gestationalWeek: Number(e.target.value) || undefined })}
                          />
                        </div>
                        <p className="text-[11px] text-pink-400 mt-3 ml-1 font-bold italic">
                          {lang === "bn" ? "শেষ মাসিকের তারিখ থেকে গণনা করুন।" : "Counted from your last menstrual period (LMP)."}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Health History */}
                {step === 3 && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="group/input">
                      <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-1 group-focus-within/input:text-pink-500 transition-colors">
                        {lang === "bn" ? "আগের গর্ভাবস্থার সংখ্যা" : "Previous Pregnancies"}
                      </label>
                      <div className="relative">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-pink-500 transition-all duration-300">
                          <Icon name="mom" size={20} />
                        </div>
                        <input
                          className="w-full bg-slate-50 border-2 border-slate-100/80 rounded-2xl py-4 pl-14 pr-6 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-pink-200 focus:ring-[6px] focus:ring-pink-50 outline-none transition-all duration-300 font-bold"
                          type="number"
                          min="0"
                          max="15"
                          placeholder={lang === "bn" ? "যেমন: ১" : "e.g., 1"}
                          value={formData.previousPregnancies || ""}
                          onChange={(e) => setFormData({ ...formData, previousPregnancies: Number(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="group/input">
                      <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-1 group-focus-within/input:text-pink-500 transition-colors">
                        {lang === "bn" ? "শারীরিক অবস্থা (যদি থাকে)" : "Known Conditions (Optional)"}
                      </label>
                      <div className="grid grid-cols-1 gap-2.5">
                        {[
                          { value: "high_blood_pressure", label: lang === "bn" ? "উচ্চ রক্তচাপ" : "High Blood Pressure" },
                          { value: "diabetes", label: lang === "bn" ? "ডায়াবেটিস" : "Diabetes" },
                          { value: "severe_anemia", label: lang === "bn" ? "গুরুতর রক্তাল্পতা" : "Severe Anemia" },
                          { value: "none", label: lang === "bn" ? "কোন সমস্যা নেই" : "No Known Issues" },
                        ].map((condition) => (
                          <button
                            key={condition.value}
                            type="button"
                            onClick={() => {
                              if (condition.value === "none") {
                                setFormData({ ...formData, riskConditions: ["none"] });
                              } else {
                                toggleRiskCondition(condition.value);
                                if (formData.riskConditions.includes("none")) {
                                  setFormData(prev => ({ ...prev, riskConditions: prev.riskConditions.filter(c => c !== "none") }));
                                }
                              }
                            }}
                            className={`py-3.5 px-5 rounded-2xl border-2 font-bold text-sm transition-all text-left flex items-center justify-between ${
                              formData.riskConditions.includes(condition.value)
                                ? "bg-pink-50 text-pink-600 border-pink-200"
                                : "bg-slate-50 text-slate-500 border-slate-100/80 hover:bg-slate-100"
                            }`}
                          >
                            <span>{condition.label}</span>
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                              formData.riskConditions.includes(condition.value) ? "bg-pink-500 border-pink-500" : "bg-white border-slate-200"
                            }`}>
                              {formData.riskConditions.includes(condition.value) && <Icon name="success" size={14} className="text-white" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Review */}
                {step === 4 && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="bg-pink-50/50 rounded-[2rem] p-6 border border-pink-100/50 space-y-4">
                      <div className="flex items-center gap-4 pb-4 border-b border-pink-100/30">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                          <Icon name="profile" size={24} className="text-pink-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{lang === "bn" ? "বয়স ও অবস্থান" : "Age & Location"}</p>
                          <p className="text-sm font-bold text-slate-700">{formData.age} {lang === "bn" ? "বছর" : "years"} • {formData.locationType}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 pb-4 border-b border-pink-100/30">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                          <Icon name="mom" size={24} className="text-pink-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{lang === "bn" ? "গর্ভাবস্থা" : "Pregnancy"}</p>
                          <p className="text-sm font-bold text-slate-700">
                            {formData.pregnancyStatus} 
                            {formData.gestationalWeek ? ` (${formData.gestationalWeek} ${lang === "bn" ? "সপ্তাহ" : "weeks"})` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                          <Icon name="health" size={24} className="text-pink-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{lang === "bn" ? "স্বাস্থ্য ইতিহাস" : "Health Status"}</p>
                          <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">
                            {formData.riskConditions.length > 0 ? formData.riskConditions.join(", ") : "None"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="mt-1 text-pink-500 flex-shrink-0">
                        <Icon name="info" size={20} />
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        {lang === "bn" 
                          ? "আপনার তথ্য নিরাপদ এবং এনক্রিপ্ট করা। আমরা শুধুমাত্র আপনাকে সঠিক সেবা দিতে এটি ব্যবহার করি।"
                          : "Your information is securely encrypted. We only use this data to personalize your care experience."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-3 text-sm text-rose-600 bg-rose-50 p-4 rounded-2xl border border-rose-100 mb-6 animate-in shake-in duration-300">
                  <Icon name="error" size={18} />
                  <p className="font-bold leading-tight">{error}</p>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4 mt-auto pt-8 relative z-10">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={loading}
                    className="flex-1 bg-slate-50 text-slate-600 py-4 rounded-2xl text-sm font-black uppercase tracking-widest border-2 border-slate-100 hover:bg-slate-100 hover:border-slate-200 active:scale-95 transition-all duration-300 disabled:opacity-50"
                  >
                    {lang === "bn" ? "পিছনে" : "Back"}
                  </button>
                )}
                
                <button 
                  type="submit" 
                  className={`relative overflow-hidden py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all duration-300 disabled:opacity-70 ${
                    step === totalSteps 
                      ? "flex-[2] bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-pink-200 hover:shadow-pink-300" 
                      : step === 1 ? "w-full bg-slate-900 text-white shadow-slate-200" : "flex-[2] bg-slate-900 text-white shadow-slate-200"
                  }`} 
                  disabled={loading}
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full hover:translate-y-0 transition-transform duration-300"></div>
                  <span className="relative flex items-center justify-center gap-3">
                    {loading ? (
                      <Icon name="sync" size={18} className="animate-spin" />
                    ) : (
                      <>
                        <span>{step === totalSteps ? (lang === "bn" ? "যাত্রা শুরু করুন" : "Start Journey") : (lang === "bn" ? "পরবর্তী" : "Next")}</span>
                        {step < totalSteps && <Icon name="sync" size={18} className="rotate-90" />}
                      </>
                    )}
                  </span>
                </button>
              </div>
              
              {/* Decorative backgrounds inside card */}
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-pink-50 rounded-full blur-3xl opacity-60 -z-10" />
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-rose-50 rounded-full blur-3xl opacity-60 -z-10" />
            </form>
          </div>
          
          {/* Trust Footer */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-6 px-8 py-3 bg-white/50 backdrop-blur-sm rounded-full border border-slate-100/50 shadow-sm">
                      <div className="flex items-center gap-2">
                <Icon name="secure" size={14} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{lang === "bn" ? "সুরক্ষিত" : "Secure"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="success" size={14} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{lang === "bn" ? "গোপনীয়" : "Private"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="health" size={14} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{lang === "bn" ? "বিশেষজ্ঞ অনুমোদিত" : "Expert Approved"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
