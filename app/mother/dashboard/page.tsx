"use client";

import DashboardCard from "@/components/DashboardCard";
import Layout from "@/components/Layout";
import CommentSection from "@/components/CommentSection";
import MessagePopup from "@/components/MessagePopup";
import DailyQuestionPopup from "@/components/DailyQuestionPopup";
import FoodRecommendations from "@/components/FoodRecommendations";
import GenerateReportModal from "@/components/GenerateReportModal";
import PatientBooking from "@/components/PatientBooking";
import Icon from "@/components/Icon";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { getLanguage } from "@/lib/i18n";
import { safeAsync } from "@/lib/safeAsync";
import { assessRisk, type RiskFactor } from "@/lib/riskPrediction";
import { calculateRiskState, getLatestActivityTimestamp, getRiskKey } from "@/lib/riskDetectionSimple";
import { Suspense } from "react";

type Profile = {
  name?: string;
  email: string;
  age?: number;
  phone?: string;
  address?: string;
  area?: string;
  ageRange?: string;
  pregnancyStatus?: string;
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

type DailyEntry = {
  id: string;
  date: string;
  entry: string;
  createdAt: string;
  updatedAt: string;
};

type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  id?: string; // For tracking dismissed messages
};

type AiRiskFactor = RiskFactor;

type Notification = {
  id: string;
  type?: "morning_recommendation" | "evening_recommendation" | "daily_task" | "general" | "report_decision";
  title?: string;
  message?: string;
  content?: string;
  read: boolean;
  createdAt: string;
};

type Prescription = { 
  key: string; 
  url: string; 
  imageUrls?: string[]; // For PDFs: converted image URLs
  imageKeys?: string[]; // For PDFs: converted image keys
  pageCount?: number; // For PDFs: number of pages
  isPdf?: boolean; // Whether this is a PDF
  customName?: string | null; // Custom display name set by user
};
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
  reported?: boolean;
  reportStatus?: "pending" | "solved" | "rejected";
  reportReason?: string;
  reportedBy?: string;
  reportedAt?: string;
  adminDecision?: string;
  adminDecisionAt?: string;
};

const AREA_OPTIONS = [
  "Dhaka",
  "Chittagong",
  "Sylhet",
  "Rajshahi",
  "Rangpur",
  "Khulna",
  "Barishal",
  "Mymensingh",
  "Pabna",
  "Cumilla",
  "Bogura",
  "Narayaganj",
  "Kushtia",
];

export default function MotherDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Icon name="sync" size={48} className="animate-spin text-pink-600" /></div>}>
      <MotherDashboardContent />
    </Suspense>
  );
}

function MotherDashboardContent() {
  const t = useTranslation();
  const [lang] = useState(() => getLanguage());
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [motherId, setMotherId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [consultationReference, setConsultationReference] = useState("");
  const [consultationLoading, setConsultationLoading] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<string | null>(null);
  const [consultationMessages, setConsultationMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "prescriptions" | "consultation" | "progress" | "journal" | "notifications" | "food" | null>(null);
  const [showCards, setShowCards] = useState(true);
  const [deletingPrescription, setDeletingPrescription] = useState<string | null>(null);
  const [renamingPrescription, setRenamingPrescription] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [dismissedRiskFactors, setDismissedRiskFactors] = useState<Record<string, number>>({});
  const [dismissedRisksLoaded, setDismissedRisksLoaded] = useState(false);
  const [aiRiskFactors, setAiRiskFactors] = useState<AiRiskFactor[]>([]);
  const [aiRiskLoading, setAiRiskLoading] = useState(false);
  const [chatHistoryMessages, setChatHistoryMessages] = useState<ChatHistoryMessage[]>([]);
  const [newEntryText, setNewEntryText] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  // Daily entry questions state
  const [dailyQuestions, setDailyQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionAnswers, setQuestionAnswers] = useState<string[]>([]);
  const [questionsCompleted, setQuestionsCompleted] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const commentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [popup, setPopup] = useState<{ isOpen: boolean; type: "success" | "error" | "warning" | "info"; title: string; message: string }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });
  const [showQuestionPopup, setShowQuestionPopup] = useState(false);
  const [questionSession, setQuestionSession] = useState<any>(null);
  const [shouldScrollToNotifications, setShouldScrollToNotifications] = useState(false);

  // Scroll to notifications when tab is active and scroll is requested
  useEffect(() => {
    if (activeTab === "notifications" && shouldScrollToNotifications) {
      // Use requestAnimationFrame for smoother, faster scrolling
      requestAnimationFrame(() => {
      const scrollToNotifications = () => {
        const notificationsElement = document.getElementById("notifications-section");
        if (notificationsElement) {
          notificationsElement.scrollIntoView({ behavior: "smooth", block: "start" });
          setShouldScrollToNotifications(false);
        } else {
            // Retry if element not found yet (with shorter delay)
            setTimeout(scrollToNotifications, 50);
        }
      };
        scrollToNotifications();
      });
    }
  }, [activeTab, shouldScrollToNotifications]);

  useEffect(() => {
    const validTabs = ["profile", "prescriptions", "consultation", "progress", "journal", "notifications", "food"];
    const tab = searchParams.get("tab");
    
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab as any);
      setShowCards(false);
    } else {
      setActiveTab(null);
      setShowCards(true);
    }
  }, [searchParams]);

  // Load dismissed risk factors from cloud (FORCE FRESH - NO CACHE)
  useEffect(() => {
    if (!motherId || !token) {
      setDismissedRisksLoaded(true);
      return;
    }
    
    const loadDismissedRisks = async () => {
      try {
        // Force fresh data with cache busting
        const res = await fetch(`/api/mother/dismissed-risks?t=${Date.now()}`, {
          headers: {
            ...authHeaders(token),
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
          },
          cache: "no-store",
        });
        
        if (res.ok) {
          const data = await res.json();
          const dismissed = data.dismissedRiskFactors || {};
          console.log("[Dashboard] Loaded dismissed risks from cloud:", {
            count: Object.keys(dismissed).length,
            keys: Object.keys(dismissed),
            timestamp: data.timestamp,
          });
          setDismissedRiskFactors(dismissed);
        } else {
          console.error("[Dashboard] Failed to load dismissed risks:", res.status);
        }
      } catch (err) {
        console.error("[Dashboard] Error loading dismissed risks:", err);
      } finally {
        setDismissedRisksLoaded(true);
      }
    };
    
    loadDismissedRisks();
  }, [motherId, token]);

  useEffect(() => {
    if (!motherId) return;
    try {
      localStorage.setItem(
        `dismissedRiskFactors:${motherId}`,
        JSON.stringify(dismissedRiskFactors)
      );
    } catch (err) {
      console.error("Failed to save dismissed risk factors:", err);
    }
  }, [motherId, dismissedRiskFactors]);

  useEffect(() => {
    // Check for OAuth token in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const oauthToken = urlParams.get('token');
    const isOAuth = urlParams.get('oauth') === 'true';
    
    let t: string;
    if (oauthToken && isOAuth) {
      // OAuth login - save token and clean URL
      localStorage.setItem("motherToken", oauthToken);
      setToken(oauthToken);
      t = oauthToken;
      // Clean URL
      window.history.replaceState({}, '', '/mother/dashboard');
    } else {
      // Regular token check
      t = localStorage.getItem("motherToken") || "";
      setToken(t);
      if (!t) return;
    }
    
    try {
      const payload = JSON.parse(atob(t.split('.')[1]));
      setMotherId(payload.id || "");
    } catch {
      // Will be set when profile loads
    }
    
    fetchProfile(t);
    
    // Check if onboarding is needed after profile loads
    const checkOnboarding = async () => {
      try {
        const res = await fetch("/api/mother/profile", {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (res.ok) {
          const data = await res.json();
          const profile = data.profile;
          
          // Redirect to onboarding if not completed
          if (!profile.onboardingComplete && !profile.age) {
            router.push("/mother/onboarding");
            return;
          }
        }
      } catch (err) {
        console.error("Error checking onboarding:", err);
      }
    };
    
    // Check onboarding after a short delay to allow profile to load
    setTimeout(checkOnboarding, 500);
    
    fetchPrescriptions(t);
    fetchQuestions(t);
    fetchDailyEntries(t);
    fetchChatHistory(t);
    fetchNotifications(t);
    updatePregnancyProgress(t);
    checkDailyTask(t);
    
    // Set today's date and load questions (only if token exists)
    if (t) {
      const today = new Date().toISOString().split("T")[0];
      if (!selectedDate) {
        setSelectedDate(today);
        // Load questions after a small delay to ensure token is set
        setTimeout(() => {
          loadDailyEntryQuestions(today);
        }, 500);
      }
    }
    
    const frequentInterval = setInterval(() => {
      fetchNotifications(t);
      fetchQuestions(t);
    }, 30 * 1000);
    
    const mediumInterval = setInterval(() => {
      fetchPrescriptions(t);
      fetchDailyEntries(t);
      fetchChatHistory(t);
    }, 2 * 60 * 1000);
    
    const slowInterval = setInterval(() => {
      updatePregnancyProgress(t);
      checkDailyTask(t);
      fetchProfile(t);
    }, 5 * 60 * 1000);
    
    return () => {
      clearInterval(frequentInterval);
      clearInterval(mediumInterval);
      clearInterval(slowInterval);
    };
  }, []);
  

  // Auto fetch consultations when entering the tab
  useEffect(() => {
    if (activeTab === "consultation") {
      fetchConsultations();
    }
  }, [activeTab]);

  const authHeaders = (t = token) =>
    t ? { Authorization: `Bearer ${t}` } : undefined;

  const checkDailyQuestions = async (t = token) => {
    try {
      const res = await fetch("/api/mother/daily-questions", {
        headers: authHeaders(t),
      });
      if (res.ok) {
        const data = await res.json();
        console.log("[Dashboard] Daily questions response:", {
          shouldShow: data.shouldShow,
          hasSession: !!data.session,
          sessionCompleted: data.session?.completed,
          questionsCount: data.questions?.length || 0,
        });
        
        // Only update session state, don't show popup here
        setQuestionSession(data.session);
        
        // Only show popup if:
        // 1. shouldShow is true (it's after the configured time)
        // 2. Session exists and is not completed
        // 3. There are actually questions to show
        if (data.shouldShow && data.session && !data.session.completed && data.questions && data.questions.length > 0) {
          console.log("[Dashboard] Showing question popup");
          setShowQuestionPopup(true);
        } else {
          console.log("[Dashboard] Not showing popup - shouldShow:", data.shouldShow, "session:", !!data.session, "completed:", data.session?.completed, "questions:", data.questions?.length || 0);
          setShowQuestionPopup(false);
        }
      } else {
        const errorData = await res.json();
        console.error("[Dashboard] Error response from daily-questions API:", errorData);
      }
    } catch (err) {
      console.error("Error checking daily questions:", err);
      // On error, don't block the dashboard
      setShowQuestionPopup(false);
    }
  };

  const fetchProfile = async (t = token) => {
    const res = await fetch("/api/mother/profile", { headers: authHeaders(t) });
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      if (data.profile?.id && !motherId) {
        setMotherId(data.profile.id);
      }
      
      // Check if account is paused and auto-logout
      if (data.profile?.status === "paused") {
        setPopup({
          isOpen: true,
          type: "error",
          title: "Account Paused",
          message: "Your account has been paused by admin. You will be logged out automatically.",
        });
        setTimeout(() => {
          localStorage.removeItem("motherToken");
          router.push("/");
        }, 3000);
      }
    } else if (res.status === 401) {
      // Token invalid or account paused - logout
      localStorage.removeItem("motherToken");
      router.push("/");
    }
  };

  const fetchPrescriptions = async (t = token) => {
    try {
      const res = await fetch("/api/mother/prescriptions", {
        headers: authHeaders(t),
      });
      if (res.ok) {
        const data = await res.json();
        console.log("Fetched prescriptions:", data.items?.length || 0, "items");
        // Ensure all items have required properties and filter out invalid items
        const mainFiles = (data.items || [])
          .filter((item: any) => {
            // Ensure item has required properties
            if (!item || !item.key || !item.url) {
              console.warn("Invalid prescription item:", item);
              return false;
            }
            const key = item.key || "";
            // Exclude page images (files ending with _page1.jpg, _page2.jpg, etc.)
            // Also exclude metadata.json (API should filter this, but double-check)
            if (key.match(/_page\d+\.(jpg|jpeg|png)$/i) || key.endsWith('metadata.json')) {
              return false;
            }
            return true;
          })
          .map((item: any) => ({
            key: item.key || "",
            url: item.url || "",
            imageUrls: item.imageUrls || [],
            imageKeys: item.imageKeys || [],
            pageCount: item.pageCount || 0,
            isPdf: item.isPdf || false,
            customName: item.customName || null,
          }));
        console.log("Filtered prescriptions (excluding page images):", mainFiles.length, "items");
        setPrescriptions(mainFiles);
      } else {
        console.error("Failed to fetch prescriptions:", res.status, res.statusText);
        const errorData = await res.json().catch(() => ({}));
        console.error("Error details:", errorData);
        // Set empty array on error to prevent crashes
        setPrescriptions([]);
      }
    } catch (err) {
      console.error("Error fetching prescriptions:", err);
      // Set empty array on error to prevent crashes
      setPrescriptions([]);
    }
  };

  const fetchChatHistory = async (t = token) => {
    try {
      console.log("[Chat History] 🔄 Fetching updated chat history...");
      const res = await fetch("/api/mother/chat-history", {
        headers: authHeaders(t),
      });
      if (res.ok) {
        const data = await res.json();
        console.log("[Chat History] ✅ Loaded messages:", { count: data.messages?.length || 0 });
        setChatHistoryMessages(data.messages || []);
      } else {
        console.error("[Chat History] ❌ Fetch failed:", res.status);
      }
    } catch (err) {
      console.error("[Chat History] ❌ Error:", err);
    }
  };

  useEffect(() => {
    const handleChatHistoryUpdated = () => {
      console.log("[Chat History] 🔔 Received update event");
      if (token) {
        // Add tiny delay to ensure save completes (backup for race condition)
        setTimeout(() => {
          fetchChatHistory(token);
        }, 150); // 150ms delay to ensure save completes
      } else {
        console.warn("[Chat History] ⚠️ No token, skipping fetch");
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "chatHistoryUpdated") {
        console.log("[Chat History] 🔔 Received storage event");
        handleChatHistoryUpdated();
      }
    };

    window.addEventListener("chatHistoryUpdated", handleChatHistoryUpdated as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("chatHistoryUpdated", handleChatHistoryUpdated as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, [token]);

  const updatePregnancyProgress = async (t = token) => {
    // Call API endpoint which handles timezone detection and updates pregnancy day
    // This is called every 5 minutes to check if it's midnight in mother's timezone
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

  const fetchDailyEntries = async (t = token) => {
    try {
      const res = await fetch("/api/mother/journal", { headers: authHeaders(t) });
      if (res.ok) {
        const data = await res.json();
        setDailyEntries(data.entries || []);
        
        // Set today's date if not already selected
        const today = new Date().toISOString().split("T")[0];
        if (!selectedDate) {
          setSelectedDate(today);
        }
      }
    } catch (err) {
      console.error("Failed to fetch daily entries:", err);
    }
  };

  const loadDailyEntryQuestions = async (date: string) => {
    if (!date || !token) return; // Don't load if no token
    
    setLoadingQuestions(true);
    try {
      const res = await fetch(`/api/mother/daily-entry-questions?date=${date}`, {
        headers: authHeaders(),
      });
      
      if (res.ok) {
        const data = await res.json();
        
        if (data.completed) {
          setQuestionsCompleted(true);
          setDailyQuestions([]);
          setCurrentQuestionIndex(0);
          setQuestionAnswers([]);
          setCurrentAnswer("");
        } else {
          setQuestionsCompleted(false);
          setDailyQuestions(data.questions || []);
          setCurrentQuestionIndex(data.currentQuestionIndex || 0);
          
          // Load existing answers for this date (from single file format)
          const allEntries = await fetch("/api/mother/journal", { headers: authHeaders() }).then(r => r.json());
          const dateEntries = (allEntries.entries || []).filter((e: DailyEntry) => e.date === date);
          const answers: string[] = [];
          const answersEntry = dateEntries.find((e: DailyEntry) => e.entry.startsWith("DAILY_ENTRY_ANSWERS:"));
          if (answersEntry) {
            try {
              const jsonStr = answersEntry.entry.replace("DAILY_ENTRY_ANSWERS:", "");
              const answersObj = JSON.parse(jsonStr);
              Object.keys(answersObj).forEach(key => {
                const index = parseInt(key);
                if (!isNaN(index)) {
                  answers[index] = answersObj[key];
                }
              });
            } catch (err) {
              console.error("Error parsing answers:", err);
            }
          }
          setQuestionAnswers(answers);
          
          // Set current answer if exists
          if (answers[data.currentQuestionIndex]) {
            setCurrentAnswer(answers[data.currentQuestionIndex]);
          } else {
            setCurrentAnswer("");
          }
        }
      } else {
        const errorData = await res.json();
        setMessage(`❌ ${errorData.error || "Failed to load questions"}`);
      }
    } catch (err) {
      console.error("Failed to load daily entry questions:", err);
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const saveDailyEntryAnswer = async (questionIndex: number, answer: string) => {
    if (!selectedDate || !answer.trim()) {
      setMessage("Please provide an answer");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/mother/daily-entry-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          date: selectedDate,
          questionIndex,
          answer: answer.trim(),
        }),
      });

      if (res.ok) {
        // Update local state
        const updatedAnswers = [...questionAnswers];
        updatedAnswers[questionIndex] = answer.trim();
        setQuestionAnswers(updatedAnswers);
        
        // Check if this was the last question
        if (questionIndex >= 5) {
          setQuestionsCompleted(true);
          setMessage("✅ All questions answered for today!");
        } else {
          // Move to next question
          setCurrentQuestionIndex(questionIndex + 1);
          setCurrentAnswer("");
          // Load next batch of questions if needed
          if (questionIndex + 1 >= dailyQuestions.length) {
            await loadDailyEntryQuestions(selectedDate);
          }
        }
        
        fetchDailyEntries();
      } else {
        const data = await res.json();
        setMessage(`❌ ${data.error || "Failed to save answer"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = useCallback(async (t = token, showLoading = false) => {
    if (showLoading) {
      setNotificationsLoading(true);
    }
    try {
      const res = await fetch("/api/mother/notifications", { headers: authHeaders(t) });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.filter((n: Notification) => !n.read).length || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      if (showLoading) {
        setNotificationsLoading(false);
      }
    }
  }, [token]);

  const handleNotificationBellClick = useCallback(() => {
    // Immediately switch to notifications tab for instant feedback
    setActiveTab("notifications");
    setShowCards(false);
    setShouldScrollToNotifications(true);
    // Fetch fresh notifications in the background
    fetchNotifications(token, true);
  }, [token, fetchNotifications]);

  const parseDoctorMarkdown = (markdown: string): any[] => {
    if (!markdown || markdown.trim().length === 0) {
      return [];
    }

    const entries: any[] = [];
    const lines = markdown.split('\n').map(l => l.trim()).filter(Boolean);
    let currentDoctor: any = {};
    let pendingImage: string | null = null;
    let pendingDetailsUrl: string | null = null;

    lines.forEach((line, index) => {
      // Extract image URL from markdown image syntax: [![alt](imageUrl)](link)
      // Handle both with and without bullet point prefix
      const imageMatch = line.match(/\[!\[.*?\]\((.*?)\)\]/);
      if (imageMatch) {
        pendingImage = imageMatch[1];
        // Also extract details URL from the link part
        const linkMatch = line.match(/\]\((https?:\/\/[^\)]+)\)/);
        if (linkMatch && linkMatch[1].includes('doctorbangladesh.com')) {
          pendingDetailsUrl = linkMatch[1];
        }
        return;
      }

      // Check if this is a new doctor entry (H3 header with doctor name)
      // Handle both with and without indentation
      const h3Match = line.match(/^###\s+\[([^\]]+)\]/);
      if (h3Match) {
        // Save previous doctor if exists
        if (currentDoctor.name) {
          entries.push(currentDoctor);
        }
        // Start new doctor
        currentDoctor = {
          name: h3Match[1].trim()
        };
        
        // Use pending image if available
        if (pendingImage) {
          currentDoctor.image = pendingImage;
          pendingImage = null;
        }
        
        // Extract details URL from H3 link
        const linkMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
        if (linkMatch && linkMatch[2].includes('doctorbangladesh.com')) {
          currentDoctor.detailsUrl = linkMatch[2];
        } else if (pendingDetailsUrl) {
          currentDoctor.detailsUrl = pendingDetailsUrl;
          pendingDetailsUrl = null;
        }
        return;
      }

      // Extract from bullet points
      if ((line.startsWith('*') || line.startsWith('-')) && currentDoctor.name) {
        const content = line.replace(/^[*\-]\s+/, '').trim();
        
        // Remove markdown bold formatting
        const cleanContent = content.replace(/\*\*(.*?)\*\*/g, '$1');

        // Qualifications (contains MBBS, FCPS, etc.)
        if (/MBBS|FCPS|MS|DGO|MCPS|MRCOG|FRCOG|BCS|Diploma|Fellowship|Training|Awarded|MACP|AFACS|CMU|DMU|CCD|DMAS|FMAS|FART|FICS|FICMCH|DRH|DOWH|MD|MMED|MPH|DMED|PhD|MSc|MMEd|FRCS|FACS|FRSH|DFFP|PGT|CCU|TVS|FICMCH|DHR/i.test(cleanContent) && !currentDoctor.qualifications) {
          currentDoctor.qualifications = cleanContent;
        }
        // Specialty (contains Specialist, Surgeon, etc. but not Hospital/Institute)
        else if (/Specialist|Surgeon|Gynecologist|Obstetrician|Infertility|Laparoscopic|Hysteroscopic/i.test(cleanContent) && 
                 !/(Hospital|Medical College|Clinic|Center|Institute|University|ICMH)/i.test(cleanContent) && 
                 !currentDoctor.specialty) {
          currentDoctor.specialty = cleanContent;
        }
        // Designation (contains Professor, Consultant, etc.)
        else if (/(Professor|Consultant|Assistant|Associate|Senior|Head|Director|Coordinator|Chief|Former|Ex|Vice Principal)/i.test(cleanContent) && 
                 !/(Hospital|Medical College|Clinic|Center|Institute|University)/i.test(cleanContent) && 
                 !currentDoctor.designation) {
          currentDoctor.designation = cleanContent;
        }
        // Hospital (contains Hospital, Medical College, Clinic, Center, Institute, University, ICMH)
        else if (/(Hospital|Medical College|Clinic|Center|Institute|University|ICMH)/i.test(cleanContent) && !currentDoctor.hospital) {
          currentDoctor.hospital = cleanContent;
        }
      }
    });

    // Add last doctor
    if (currentDoctor.name) {
      entries.push(currentDoctor);
    }

    return entries;
  };

  const fetchDoctorDetails = async (_doctor: any) => {
    if (!_doctor.detailsUrl) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "Doctor details URL not available.",
      });
      return;
    }

    // setDoctorDetailsLoading(true);
    // setSelectedDoctorDetails({ doctor });

    try {
      const params = new URLSearchParams({
        api_key: process.env.NEXT_PUBLIC_SCRAPINGDOG_API_KEY || "",
        url: _doctor.detailsUrl,
        dynamic: 'false',
        markdown: 'true'
      });

      const res = await fetch(`https://api.scrapingdog.com/scrape?${params.toString()}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch doctor details (${res.status})`);
      }
      
      const markdown = await res.text();
      
      if (!markdown || markdown.trim().length === 0) {
        throw new Error("No data received from the server.");
      }

      // Parse markdown to extract details
      const lines = markdown.split('\n').map(l => l.trim()).filter(Boolean);
      let details = "";
      let chambers = "";
      let appointments = "";
      let about = "";
      let currentSection = "";
      let collectingContent = false;
      let previousLine = "";

      lines.forEach((line, index) => {
        // Detect headers with underline (both = and -)
        const isUnderline = /^[-=]+$/.test(line) && previousLine && previousLine.length > 0;
        const isHeader = /^#{1,3}\s/.test(line) || isUnderline;
        let headerText = "";
        let shouldProcessHeader = false;

        if (isUnderline) {
          headerText = previousLine;
          shouldProcessHeader = true;
        } else if (/^#{1,3}\s/.test(line)) {
          headerText = line.replace(/^#{1,3}\s+/, '').trim();
          shouldProcessHeader = true;
        }

        // Process section headers
        if (shouldProcessHeader && headerText) {
          const lowerHeader = headerText.toLowerCase();
          
          if (/chamber.*appointment|appointment.*chamber/i.test(headerText)) {
            currentSection = "chambers";
            collectingContent = true;
          } else if (/^about/i.test(headerText)) {
            currentSection = "about";
            collectingContent = true;
          } else {
            // Stop collecting if we hit a different section
            if (/more.*doctor|join.*doctor|add profile|contact|advertisement|payment|privacy|disclaimer|copyright/i.test(headerText)) {
              currentSection = "";
              collectingContent = false;
            } else if (!/^[A-Z][a-z]+.*Dr\.|Dr\..*[A-Z]/.test(headerText)) {
              // Unknown section, stop collecting
              currentSection = "";
              collectingContent = false;
            }
          }
          previousLine = line;
          return; // Skip processing the underline line itself
        }

        // Extract content based on section
        if (collectingContent && line && !isHeader && currentSection) {
          // Skip image lines, navigation links, and other non-content
          if (line.match(/^!\[.*\]\(|^\[.*\]\(http|^\[Call Now\]|^\[See Chambers\]|^\[.*\]\(fb:|^\[.*\]\(tel:/) ||
              /more.*doctor|join.*doctor|add profile|contact|advertisement|payment|privacy|disclaimer|copyright/i.test(line)) {
            previousLine = line;
            return;
          }

          const cleanLine = line.replace(/^[*\-]\s*/, '').trim();
          
          // Remove markdown formatting but keep structure
          let processedLine = cleanLine
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold, keep text
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1'); // Remove links, keep text

          if (processedLine && processedLine.length > 2) {
            // Skip rating lines and empty lines
            if (/^★+|rating|review|^\d+\)$/.test(processedLine)) {
              previousLine = line;
              return;
            }

            if (currentSection === "chambers") {
              // Collect ALL chamber and appointment information
              if (!chambers) chambers = processedLine;
              else chambers += "\n" + processedLine;
            } else if (currentSection === "about") {
              // Collect about section content
              // Skip if it's just the doctor name or very short
              if (processedLine.length > 20 && !/^[A-Z][a-z]+.*Dr\.|Dr\..*[A-Z]/.test(processedLine)) {
                if (!about) about = processedLine;
                else about += "\n" + processedLine;
              }
            }
          }
        }

        previousLine = line;
      });

      // setSelectedDoctorDetails({
      //   doctor: _doctor,
      //   details: details || undefined,
      //   chambers: chambers || undefined,
      //   appointments: appointments || undefined,
      //   about: about || undefined,
      // });
    } catch (err: any) {
      console.error("Error fetching doctor details:", err);
      setPopup({
        isOpen: true,
        type: "error",
        title: "Error",
        message: err?.message || "Could not load doctor details. Please try again.",
      });
      // setSelectedDoctorDetails(null);
    } finally {
      // setDoctorDetailsLoading(false);
    }
  };

  const fetchDoctorList = async (_area: string) => {
    // Function disabled - Find a Doctor feature removed
    return;
  };

  const deleteNotification = async (notificationId: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/mother/notifications?notificationId=${notificationId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        setMessage("Notification deleted successfully");
        fetchNotifications();
      } else {
        const data = await res.json();
        setMessage(`Failed to delete notification: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
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

  const generateReport = async (type: "overall" | "dateRange", startDate?: string, endDate?: string) => {
    setGeneratingReport(true);
    try {
      const res = await fetch("/api/mother/generate-report", {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, startDate, endDate }),
      });

      const data = await res.json();
      if (res.ok && data.report) {
        console.log("Report data received:", data.report);
        // Validate report data
        if (!data.report.patientInfo || !data.report.patientInfo.name) {
          throw new Error("Invalid report data: missing patient information");
        }
        // Generate and download PDF
        await generatePDF(data.report);
        setShowReportModal(false);
        setMessage("✅ Report generated and downloaded successfully!");
      } else {
        console.error("Report generation failed:", data);
        setMessage(`❌ ${data.error || "Failed to generate report"}`);
      }
    } catch (err: any) {
      console.error("Error generating report:", err);
      setMessage(`❌ ${err.message || "Network error. Please try again."}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  const generatePDF = async (reportData: any) => {
    let element: HTMLElement | null = null;
    let styleElement: HTMLStyleElement | null = null;
    let fontLink: HTMLLinkElement | null = null;
    
    try {
      console.log("Generating PDF with data:", reportData);
      
      // Validate report data
      if (!reportData || !reportData.patientInfo) {
        throw new Error("Invalid report data provided");
      }
      
      // Use html2pdf for better Bangla text support
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;
      
      // Create HTML content for the report
      const bodyHTML = generateReportBodyHTML(reportData);
      console.log("Generated HTML length:", bodyHTML.length);
      
      if (!bodyHTML || bodyHTML.trim().length === 0) {
        throw new Error("Generated HTML is empty");
      }
      
      // Load fonts first (check if already loaded)
      const existingFontLink = document.querySelector('link[href*="Noto+Sans+Bengali"]');
      if (!existingFontLink) {
        fontLink = document.createElement("link");
        fontLink.rel = "stylesheet";
        fontLink.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&family=Inter:wght@400;600;700&display=swap";
        document.head.appendChild(fontLink);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      // Wait for fonts to load
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      
      // Create a temporary container element with proper styling
      element = document.createElement("div");
      element.id = "pdf-content-wrapper";
      
      // Inject comprehensive styles
      styleElement = document.createElement("style");
      styleElement.id = "pdf-styles";
      styleElement.textContent = `
        #pdf-content-wrapper {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 999999;
          background: white;
          overflow: auto;
          padding: 20px;
          box-sizing: border-box;
        }
        #pdf-content {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          padding: 20px;
          box-sizing: border-box;
          font-family: 'Noto Sans Bengali', 'Inter', sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #333;
        }
        #pdf-content .header {
          background: #1e40af;
          color: white;
          padding: 20px;
          text-align: center;
          margin-bottom: 20px;
          border-radius: 8px;
        }
        #pdf-content .header h1 {
          font-size: 20pt;
          font-weight: 700;
          margin-bottom: 10px;
          color: white;
        }
        #pdf-content .header-info {
          font-size: 9pt;
          opacity: 0.9;
          color: white;
        }
        #pdf-content .section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        #pdf-content .section-title {
          font-size: 14pt;
          font-weight: 700;
          color: #059669;
          margin-bottom: 12px;
          padding-bottom: 5px;
          border-bottom: 2px solid #059669;
        }
        #pdf-content .info-row {
          margin-bottom: 8px;
          padding: 5px 0;
        }
        #pdf-content .info-label {
          font-weight: 600;
          color: #555;
          display: inline-block;
          min-width: 150px;
        }
        #pdf-content .info-value {
          color: #333;
        }
        #pdf-content .analysis {
          background: #f8fafc;
          padding: 15px;
          border-left: 4px solid #3b82f6;
          margin: 15px 0;
          border-radius: 4px;
          white-space: pre-wrap;
          font-size: 10pt;
          line-height: 1.8;
          color: #333;
        }
        #pdf-content .allergy {
          color: #dc2626;
          font-weight: 600;
        }
        #pdf-content .stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin: 15px 0;
        }
        #pdf-content .stat-item {
          background: #f1f5f9;
          padding: 10px;
          border-radius: 4px;
          text-align: center;
        }
        #pdf-content .stat-value {
          font-size: 16pt;
          font-weight: 700;
          color: #1e40af;
        }
        #pdf-content .stat-label {
          font-size: 9pt;
          color: #64748b;
          margin-top: 5px;
        }
      `;
      document.head.appendChild(styleElement);
      
      // Create inner content div
      const contentDiv = document.createElement("div");
      contentDiv.id = "pdf-content";
      contentDiv.innerHTML = bodyHTML;
      element.appendChild(contentDiv);
      
      // Append to body
      document.body.appendChild(element);
      
      // Force multiple reflows to ensure rendering
      element.offsetHeight;
      contentDiv.offsetHeight;
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify element has content and is visible
      if (!contentDiv.innerHTML || contentDiv.innerHTML.trim().length === 0) {
        throw new Error("Report content is empty");
      }
      
      const computedStyle = window.getComputedStyle(contentDiv);
      console.log("Element content length:", contentDiv.innerHTML.length);
      console.log("Element dimensions:", {
        width: computedStyle.width,
        height: computedStyle.height,
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity
      });
      
      // Verify element is actually visible
      if (computedStyle.display === "none" || computedStyle.visibility === "hidden" || computedStyle.opacity === "0") {
        throw new Error("Element is not visible");
      }
      
      const opt = {
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: `Medical_Report_${(reportData.patientInfo.name || "Patient").replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          letterRendering: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          windowWidth: contentDiv.scrollWidth,
          windowHeight: contentDiv.scrollHeight,
        },
        jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };
      
      console.log("Starting PDF generation from content div...");
      const worker = html2pdf().set(opt).from(contentDiv);
      await worker.save();
      console.log("PDF generation completed");
      
    } catch (error: any) {
      console.error("PDF generation error:", error);
      console.error("Error stack:", error.stack);
      alert(`Failed to generate PDF: ${error.message || "Unknown error"}. Check console for details.`);
    } finally {
      // Clean up
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
      // Don't remove font link as it might be used elsewhere
    }
  };

  const generateReportBodyHTML = (reportData: any): string => {
    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleString();
    };

    // Escape HTML to prevent XSS
    const escapeHtml = (text: string) => {
      if (!text) return "";
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    return `
  <div class="header">
    <h1>COMPREHENSIVE MEDICAL REPORT</h1>
    <div class="header-info">
      Generated on: ${formatDate(reportData.generatedAt)}<br>
      ${reportData.dateRange ? `Report Period: ${reportData.dateRange.startDate} to ${reportData.dateRange.endDate}` : "Report Type: Overall Medical History"}
    </div>
  </div>

  <div class="section">
    <div class="section-title">PATIENT INFORMATION</div>
    ${reportData.patientInfo.name ? `<div class="info-row"><span class="info-label">Name:</span><span class="info-value">${escapeHtml(reportData.patientInfo.name)}</span></div>` : ""}
    ${reportData.patientInfo.age ? `<div class="info-row"><span class="info-label">Age:</span><span class="info-value">${escapeHtml(String(reportData.patientInfo.age))} years</span></div>` : ""}
    ${reportData.patientInfo.email ? `<div class="info-row"><span class="info-label">Email:</span><span class="info-value">${escapeHtml(reportData.patientInfo.email)}</span></div>` : ""}
    ${reportData.patientInfo.phone ? `<div class="info-row"><span class="info-label">Phone:</span><span class="info-value">${escapeHtml(reportData.patientInfo.phone)}</span></div>` : ""}
    ${reportData.patientInfo.address ? `<div class="info-row"><span class="info-label">Address:</span><span class="info-value">${escapeHtml(reportData.patientInfo.address)}</span></div>` : ""}
    ${reportData.patientInfo.bloodGroup ? `<div class="info-row"><span class="info-label">Blood Group:</span><span class="info-value">${escapeHtml(reportData.patientInfo.bloodGroup)}</span></div>` : ""}
    ${reportData.patientInfo.emergencyContact ? `<div class="info-row"><span class="info-label">Emergency Contact:</span><span class="info-value">${escapeHtml(reportData.patientInfo.emergencyContact)} (${escapeHtml(reportData.patientInfo.emergencyPhone || "N/A")})</span></div>` : ""}
  </div>

  <div class="section">
    <div class="section-title">PREGNANCY INFORMATION</div>
    ${reportData.pregnancyInfo.monthsPregnant && reportData.pregnancyInfo.monthsPregnant !== "N/A" 
      ? `<div class="info-row"><span class="info-label">Pregnancy Duration:</span><span class="info-value">${reportData.pregnancyInfo.monthsPregnant} months (${reportData.pregnancyInfo.weeksPregnant || "N/A"} weeks)</span></div>`
      : reportData.pregnancyInfo.weeksPregnant && reportData.pregnancyInfo.weeksPregnant !== "N/A"
      ? `<div class="info-row"><span class="info-label">Pregnancy Duration:</span><span class="info-value">${reportData.pregnancyInfo.weeksPregnant} weeks</span></div>`
      : ""}
    ${reportData.pregnancyInfo.dueDate && reportData.pregnancyInfo.dueDate !== "N/A" ? `<div class="info-row"><span class="info-label">Due Date:</span><span class="info-value">${reportData.pregnancyInfo.dueDate}</span></div>` : ""}
    ${reportData.pregnancyInfo.previousPregnancies !== undefined ? `<div class="info-row"><span class="info-label">Previous Pregnancies:</span><span class="info-value">${reportData.pregnancyInfo.previousPregnancies}</span></div>` : ""}
  </div>

  <div class="section">
    <div class="section-title">MEDICAL INFORMATION</div>
    ${reportData.medicalInfo.conditions && reportData.medicalInfo.conditions !== "None" ? `<div class="info-row"><span class="info-label">Medical Conditions:</span><span class="info-value">${escapeHtml(reportData.medicalInfo.conditions)}</span></div>` : ""}
    ${reportData.medicalInfo.medications && reportData.medicalInfo.medications !== "None" ? `<div class="info-row"><span class="info-label">Current Medications:</span><span class="info-value">${escapeHtml(reportData.medicalInfo.medications)}</span></div>` : ""}
    ${reportData.medicalInfo.allergies && reportData.medicalInfo.allergies !== "None" ? `<div class="info-row"><span class="info-label">Allergies:</span><span class="info-value allergy">${escapeHtml(reportData.medicalInfo.allergies)}</span></div>` : ""}
  </div>

  ${reportData.analyses ? `
    ${reportData.analyses.prescriptionsAndReports && reportData.analyses.prescriptionsAndReports.trim() ? `
    <div class="section">
      <div class="section-title">PRESCRIPTIONS & REPORTS ANALYSIS</div>
      <div class="analysis">${escapeHtml(reportData.analyses.prescriptionsAndReports)}</div>
    </div>
    ` : ""}

    ${reportData.analyses.questionsAndAnswers && reportData.analyses.questionsAndAnswers.trim() ? `
    <div class="section">
      <div class="section-title">DOCTOR CONSULTATIONS SUMMARY</div>
      <div class="analysis">${escapeHtml(reportData.analyses.questionsAndAnswers)}</div>
    </div>
    ` : ""}

    ${reportData.analyses.dailyEntries && reportData.analyses.dailyEntries.trim() ? `
    <div class="section">
      <div class="section-title">DAILY JOURNAL ANALYSIS</div>
      <div class="analysis">${escapeHtml(reportData.analyses.dailyEntries)}</div>
    </div>
    ` : ""}

    ${reportData.analyses.chatHistory && reportData.analyses.chatHistory.trim() ? `
    <div class="section">
      <div class="section-title">HEALTH CONVERSATION ANALYSIS</div>
      <div class="analysis">${escapeHtml(reportData.analyses.chatHistory)}</div>
    </div>
    ` : ""}

    ${reportData.analyses.dailyRoutines && reportData.analyses.dailyRoutines.trim() ? `
    <div class="section">
      <div class="section-title">NUTRITION & EXERCISE ANALYSIS</div>
      <div class="analysis">${escapeHtml(reportData.analyses.dailyRoutines)}</div>
    </div>
    ` : ""}
  ` : ""}

  <div class="section">
    <div class="section-title">DATA SUMMARY</div>
    <div class="stats">
      <div class="stat-item">
        <div class="stat-value">${reportData.statistics.totalDailyEntries}</div>
        <div class="stat-label">Daily Entries</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${reportData.statistics.totalRoutines}</div>
        <div class="stat-label">Routines Tracked</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${reportData.statistics.totalQuestions}</div>
        <div class="stat-label">Questions Asked</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${reportData.statistics.totalPrescriptions || 0}</div>
        <div class="stat-label">Prescriptions</div>
      </div>
    </div>
  </div>

  ${reportData.prescriptions && reportData.prescriptions.length > 0 ? `
  <div class="section">
    <div class="section-title">PRESCRIPTIONS & REPORTS (${reportData.prescriptions.length} file(s))</div>
    ${reportData.prescriptions.map((p: any) => `<div class="info-row">• ${p.fileName}</div>`).join("")}
  </div>
  ` : ""}

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 9pt;">
    Generated by MomsCare AI - Comprehensive Pregnancy Care Platform
  </div>
    `;
  };


  const saveDailyEntry = async () => {
    if (!selectedDate || !newEntryText.trim()) {
      setMessage("Please write something in your daily entry");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/mother/journal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          date: selectedDate,
          entry: newEntryText.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Daily entry saved successfully!");
        setNewEntryText("");
        fetchDailyEntries();
      } else {
        setMessage(`❌ ${data.error || "Failed to save daily entry"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateDailyEntry = async (entryId: string, entryText: string) => {
    if (!entryText.trim()) {
      setMessage("Please write something in your daily entry");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/mother/journal", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          entryId,
          entry: entryText.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Daily entry updated successfully!");
        setEditingEntryId(null);
        fetchDailyEntries();
      } else {
        setMessage(`❌ ${data.error || "Failed to update daily entry"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const deleteDailyEntry = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/mother/journal?entryId=${entryId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (res.ok) {
        setMessage("✅ Daily entry deleted successfully!");
        fetchDailyEntries();
      } else {
        const data = await res.json();
        setMessage(`❌ ${data.error || "Failed to delete daily entry"}`);
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

  // Consultation functions
  const fetchConsultations = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/mother/consultations", {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setConsultations(data.consultations || []);
      }
    } catch (err) {
      console.error("Failed to fetch consultations:", err);
    }
  };

  const requestConsultation = async () => {
    if (!consultationReference?.trim() || !token) return;
    setConsultationLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/mother/consultations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ referenceNumber: consultationReference.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Consultation request sent successfully!");
        setConsultationReference("");
        fetchConsultations();
      } else {
        setMessage(`❌ ${data.error || "Failed to send consultation request"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setConsultationLoading(false);
    }
  };

  const removeConsultation = async (consultationId: string) => {
    if (!confirm("Are you sure you want to remove this consultation? This will delete all messages with this doctor.")) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/consultations/${consultationId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      
      if (res.ok) {
        setMessage("✅ Consultation removed successfully");
        fetchConsultations();
      } else {
        const data = await res.json();
        setMessage(`❌ ${data.error || "Failed to remove consultation"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openConsultationChat = async (consultationId: string) => {
    setSelectedConsultation(consultationId);
    await loadConsultationMessages(consultationId);
  };

  const loadConsultationMessages = async (consultationId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/consultations/${consultationId}/messages`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setConsultationMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const sendConsultationMessage = async () => {
    if (!selectedConsultation || !newMessage.trim() || !token) return;
    try {
      const res = await fetch(`/api/consultations/${selectedConsultation}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ message: newMessage.trim() }),
      });
      if (res.ok) {
        setNewMessage("");
        await loadConsultationMessages(selectedConsultation);
      } else {
        const data = await res.json();
        setMessage(`❌ ${data.error || "Failed to send message"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    }
  };

  const fetchQuestions = async (t = token) => {
    // Function disabled - QnA feature removed
    return;
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    setMessage("");
    
    // Validate required fields
    if (!profile.name || profile.name.trim() === "") {
      setMessage("❌ Name is required");
      setLoading(false);
      return;
    }
    
    try {
      console.log("[Profile Save] Sending profile update:", {
        name: profile.name,
        age: profile.age,
        phone: profile.phone,
        area: profile.area,
        bloodGroup: profile.bloodGroup,
        daysPregnant: profile.daysPregnant,
        conditions: profile.conditions,
        allergies: profile.allergies,
        medications: profile.medications,
      });
      
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
        const errorMsg = data.error || "Could not save profile";
        console.error("[Profile Save] ❌ Save failed:", errorMsg);
        setMessage(`❌ ${errorMsg}`);
        return;
      }
      
      // Update local profile state with saved data
      if (data.profile) {
        setProfile(data.profile);
        console.log("[Profile Save] ✅ Profile saved successfully");
        setMessage(`✅ ${t.mother.profileUpdated || "Profile updated successfully"}`);
        
        // Refresh profile data to ensure consistency
        setTimeout(() => {
          fetchProfile();
        }, 500);
      } else {
        console.warn("[Profile Save] ⚠️ No profile data in response");
        setMessage(`✅ ${t.mother.profileUpdated || "Profile updated successfully"}`);
      }
    } catch (err: any) {
      console.error("[Profile Save] ❌ Network error:", err);
      setMessage(`❌ Network error: ${err.message || "Please try again"}`);
    } finally {
      setLoading(false);
    }
  };

  const uploadPrescription = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) {
      setMessage("❌ Please select a file");
      return;
    }
    
    await handleFileUpload(selectedFile);
  };

  const handleFileUpload = async (file: File) => {
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
      } catch (parseError) {
        console.error("Failed to parse upload response:", parseError);
        setMessage(`❌ Failed to parse server response. Please try again.`);
        return;
      }
      
      if (res.ok) {
        console.log("Upload successful:", data);
        setMessage(`✅ ${t.mother.prescriptionUploaded}`);
        const fileInput = document.querySelector('input[name="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        setSelectedFile(null);
        
        // Refresh prescriptions list after a short delay to ensure files are available
        setTimeout(() => {
          fetchPrescriptions();
        }, 500);
        
        // Reset camera state
        setShowCamera(false);
        setCapturedImage(null);
        // Clear message after 3 seconds
        setTimeout(() => setMessage(""), 3000);
      } else {
        console.error("Upload failed:", data);
        const errorMsg = data.error || data.details || "Upload failed. Please try again.";
        setMessage(`❌ ${errorMsg}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Prefer back camera
      });
      setCameraStream(stream);
      setShowCamera(true);
      setCapturedImage(null);
    } catch (err: any) {
      console.error("Camera error:", err);
      setMessage(`❌ ${err.message || "Failed to access camera. Please check permissions."}`);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
    setCapturedImage(null);
  };

  const capturePhoto = () => {
    const video = document.getElementById("camera-video") as HTMLVideoElement;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedImage(imageDataUrl);
    }
  };

  const uploadCapturedImage = async () => {
    if (!capturedImage) return;
    
    // Convert data URL to File
    const response = await fetch(capturedImage);
    const blob = await response.blob();
    const file = new File([blob], `prescription_${Date.now()}.jpg`, { type: "image/jpeg" });
    
    // Stop camera
    stopCamera();
    
    // Upload the file
    await handleFileUpload(file);
  };

  const submitQuestion = async () => {
    // Function disabled - QnA feature removed
    return;
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

  // SIMPLIFIED RISK DETECTION - Build symptom text
  const symptomSignalText = useMemo(() => {
    const recentDailyEntryText = [...dailyEntries]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 3)
      .map(e => e.entry)
      .filter(Boolean)
      .join(" ");

    const recentConsultationText = [...consultationMessages]
      .filter(m => m.senderRole === "mother")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(m => m.message)
      .filter(Boolean)
      .join(" ");

    const recentChatText = [...chatHistoryMessages]
      .filter(m => m.role === "user")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 12)
      .map(m => m.content)
      .filter(Boolean)
      .join(" ");

    const result = [recentDailyEntryText, recentConsultationText, recentChatText].filter(Boolean).join(" ").trim();
    
    console.log("[SymptomText] Updated:", {
      length: result.length,
      preview: result.substring(0, 100) + (result.length > 100 ? "..." : ""),
      sources: {
        dailyEntries: dailyEntries.length,
        consultation: consultationMessages.length,
        chat: chatHistoryMessages.length,
      }
    });
    
    return result;
  }, [dailyEntries, consultationMessages, chatHistoryMessages]);

  // Get latest activity timestamp
  const latestActivityAt = useMemo(() => 
    getLatestActivityTimestamp(dailyEntries, chatHistoryMessages, consultationMessages),
    [dailyEntries, chatHistoryMessages, consultationMessages]
  );

  // Stable profile data for AI risk detection (prevent unnecessary API calls)
  const profileDataForAI = useMemo(() => ({
    age: profile?.age,
    conditions: profile?.conditions,
    medications: profile?.medications,
    allergies: profile?.allergies,
    previousPregnancies: profile?.previousPregnancies,
  }), [profile?.age, profile?.conditions, profile?.medications, profile?.allergies, profile?.previousPregnancies]);

  useEffect(() => {
    if (!token || !dismissedRisksLoaded) return; // Wait for dismissed risks to load
    const trimmedText = symptomSignalText.trim();
    if (!trimmedText) {
      // DON'T CLEAR! Just skip processing if no text
      // Keep existing aiRiskFactors - they're still valid
      console.log("[AI Risk] ℹ️  No symptom text, keeping existing risks");
      return; // Exit without clearing aiRiskFactors
    }

    // Create stable hash from text content
    const textHash = trimmedText
      .split('')
      .reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0)
      .toString(36);

    const controller = new AbortController();
    // DON'T clear existing aiRiskFactors here - keep them while loading new ones
    setAiRiskLoading(true);
    
    const timeout = setTimeout(async () => {
      try {
        console.log("[AI Risk] 🔍 Starting analysis for hash:", textHash);
        
        // Try to get cached AI results from CLOUD first (prevents different chips on different devices!)
        const cacheRes = await fetch(`/api/mother/ai-risk/cache?hash=${textHash}`, {
          headers: authHeaders(token),
          signal: controller.signal,
        });
        
        if (cacheRes.ok) {
          const cacheData = await cacheRes.json();
          if (cacheData.risks && cacheData.risks.length > 0) {
            console.log("[AI Risk] ✅ Using CLOUD cached results:", {
              count: cacheData.risks.length,
              risks: cacheData.risks.map((r: any) => r.factor),
              hash: textHash,
            });
            setAiRiskFactors(cacheData.risks);
            setAiRiskLoading(false);
            return;
          }
        }
        
        // No cache found, generate new AI risks
        console.log("[AI Risk] ⚙️ Cache miss, calling AI API...");
        const res = await fetch("/api/mother/ai-risk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(token),
          },
          body: JSON.stringify({
            text: trimmedText,
            profile: profileDataForAI,
            textHash, // Send hash so API can cache it
          }),
          signal: controller.signal,
        });

        if (res.ok) {
          const data = await res.json();
          // Mark AI-generated risks as symptom-based (dismissible)
          const aiFactors = (data.riskFactors || []).map((factor: RiskFactor) => ({
            ...factor,
            source: "symptoms" as const,
          }));
          console.log("[AI Risk] ✅ AI analysis complete:", {
            count: aiFactors.length,
            risks: aiFactors.map((r: any) => ({ factor: r.factor, points: r.points })),
            hash: textHash,
          });
          
          // Only update if we got valid risks
          if (aiFactors.length > 0) {
            setAiRiskFactors(aiFactors);
          } else {
            console.log("[AI Risk] ℹ️  No risks detected, keeping existing ones");
            // Don't clear - keep existing risks
          }
        } else {
          console.error("[AI Risk] ❌ API error:", res.status);
          // Don't clear on error - keep existing risks
        }
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          console.error("[AI Risk] ❌ Fetch error:", err);
          // Don't clear on error - keep existing risks
        }
      } finally {
        setAiRiskLoading(false);
      }
    }, 300); // Increased to 300ms for debouncing rapid updates

    return () => {
      clearTimeout(timeout);
      controller.abort();
      setAiRiskLoading(false);
    };
  }, [token, symptomSignalText, profileDataForAI, dismissedRisksLoaded]);

  // SIMPLIFIED RISK STATE - Single calculation (wait for dismissed risks to load)
  const riskState = useMemo(() => {
    if (!profile || !dismissedRisksLoaded) {
      console.log("[Risk] ⏳ Waiting for data:", { hasProfile: !!profile, dismissedRisksLoaded });
      return null;
    }
    
    console.log("[Risk] 📊 Calculating risk state with:", {
      aiRiskCount: aiRiskFactors.length,
      aiRisks: aiRiskFactors.map(r => ({ factor: r.factor, points: r.points })),
      dismissedCount: Object.keys(dismissedRiskFactors).length,
    });
    
    const state = calculateRiskState(
      profile,
      symptomSignalText,
      aiRiskFactors,
      dismissedRiskFactors,
      latestActivityAt
    );
    
    console.log("[Risk] ✅ Risk calculated:", {
      riskLevel: state?.riskLevel,
      riskScore: state?.riskScore,
      activeRisks: state?.activeRisks.length,
      activeRiskDetails: state?.activeRisks.map(r => ({ factor: r.factor, points: r.points })),
      dismissedCount: Object.keys(dismissedRiskFactors).length,
      timestamp: new Date().toISOString()
    });
    
    return state;
  }, [profile, symptomSignalText, aiRiskFactors, dismissedRiskFactors, latestActivityAt, dismissedRisksLoaded]);

  const handleDismissRiskFactor = useCallback(
    async (factor: RiskFactor) => {
      const key = getRiskKey(factor);
      const timestamp = Date.now();
      const updated = {
        ...dismissedRiskFactors,
        [key]: timestamp
      };
      
      console.log("[Dashboard] Dismissing risk:", {
        key,
        timestamp,
        totalDismissed: Object.keys(updated).length,
      });
      
      // Update local state immediately for instant UI feedback
      setDismissedRiskFactors(updated);
      
      // Save to cloud and WAIT for confirmation
      if (token) {
        try {
          const res = await fetch("/api/mother/dismissed-risks", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders(token),
              "Cache-Control": "no-cache",
            },
            body: JSON.stringify({ dismissedRiskFactors: updated }),
          });
          
          if (res.ok) {
            const data = await res.json();
            console.log("[Dashboard] Saved to cloud successfully:", {
              timestamp: data.timestamp,
              count: Object.keys(updated).length,
            });
          } else {
            console.error("[Dashboard] Save failed:", res.status);
          }
        } catch (err) {
          console.error("[Dashboard] Save error:", err);
        }
      }
    },
    [dismissedRiskFactors, token]
  );

  // Compatibility wrapper - old code uses activeRiskAssessment
  const activeRiskAssessment = useMemo(() => {
    if (!riskState) return null;
    
    const recommendations: string[] = [];
    if (riskState.riskLevel === "high") {
      recommendations.push("⚠️ HIGH RISK: Requires close monitoring and frequent prenatal visits.");
      recommendations.push("Consider consultation with a maternal-fetal medicine specialist.");
    } else if (riskState.riskLevel === "medium") {
      recommendations.push("Moderate risk factors present. Regular monitoring recommended.");
    } else {
      recommendations.push("Low risk profile. Continue regular prenatal care.");
    }

    riskState.activeRisks
      .filter(f => f.severity === "high" || f.severity === "critical")
      .forEach(f => {
        if (!recommendations.includes(f.recommendation)) {
          recommendations.push(f.recommendation);
        }
      });

    return {
      riskFactors: riskState.activeRisks,
      riskScore: riskState.riskScore,
      overallRisk: riskState.riskLevel,
      recommendations,
      requiresMonitoring: riskState.riskLevel !== "low",
    };
  }, [riskState]);

  const aiEarlyRiskSummary = useMemo(() => {
    if (!activeRiskAssessment) return null;

    const factorHighlights = activeRiskAssessment.riskFactors
      .map((factor) => factor.factor)
      .filter(Boolean)
      .slice(0, 3);

    const whySummary =
      factorHighlights.length > 0
        ? `Detected signals: ${factorHighlights.join(", ")}.`
        : "No high-risk signals detected from the latest profile updates or recent activity.";

    const actionItems =
      activeRiskAssessment.recommendations.length > 0
        ? activeRiskAssessment.recommendations.slice(0, 3)
        : [
            "Continue daily entries so the system can detect subtle changes.",
            "Upload new prescriptions whenever they change.",
            "Contact a clinician if you notice concerning symptoms.",
          ];

    return {
      whySummary,
      actionItems,
    };
  }, [activeRiskAssessment]);

  const handleEarlyRiskCardClick = () => {
    setActiveTab("progress");
    setShowCards(false);
    setTimeout(() => {
      const riskSection = document.getElementById("early-risk-section");
      if (riskSection) {
        riskSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 250);
  };

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


  const navigationCards = [
    {
      id: "chat",
      title: "MomsCare AI Chat",
      description: "Get instant answers from MomsCare AI.",
      icon: "chat",
      href: "/chat",
      accent: "from-pink-500 to-rose-500",
    },
    {
      id: "profile",
      title: "Profile Details",
      description: "View and update your health profile and preferences.",
      icon: "profile",
      href: "/mother/dashboard?tab=profile",
      accent: "from-indigo-500 to-blue-500",
    },
    {
      id: "progress",
      title: "Risk Report",
      description: "Track your pregnancy journey and comprehensive health risk analysis.",
      icon: "warning.png",
      href: "/mother/dashboard?tab=progress",
      accent: "from-yellow-400 to-amber-500",
    },
    {
      id: "prescriptions",
      title: "Prescription",
      description: "Upload or review prescriptions for better guidance.",
      icon: "prescription",
      href: "/mother/dashboard?tab=prescriptions",
      accent: "from-cyan-500 to-teal-500",
    },
    {
      id: "consultation",
      title: "Doctor Consultation",
      description: "Connect with your doctor, share medical details, and message directly.",
      icon: "doctor",
      href: "/mother/dashboard?tab=consultation",
      accent: "from-blue-500 to-cyan-500",
    },
    {
      id: "journal",
      title: "Daily Entry",
      description: "Log daily notes, symptoms, and mood changes.",
      icon: "daily-entry",
      href: "/mother/dashboard?tab=journal",
      accent: "from-amber-500 to-orange-500",
    },
    {
      id: "food",
      title: "Daily Routine",
      description: "Get personalized daily food and exercise suggestions based on your health profile.",
      icon: "health",
      href: "/mother/dashboard?tab=food",
      accent: "from-orange-500 to-pink-500",
    },
    {
      id: "generate-report",
      title: "Generate Report",
      description: "Create a comprehensive medical report for your doctor.",
      icon: "prescription",
      action: () => setShowReportModal(true),
      accent: "from-blue-500 to-cyan-500",
    },
  ];

  // Calculate days left to due date
  const daysLeft = profile?.dueDate 
    ? Math.max(0, Math.ceil((new Date(profile.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : null;
  const weeksPregnant = profile?.weeksPregnant || (profile?.daysPregnant ? Math.floor(profile.daysPregnant / 7) : null);

  return (
    <Layout>
      {showReportModal && (
        <GenerateReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          onGenerate={generateReport}
          generating={generatingReport}
        />
      )}
      {showQuestionPopup && token && (
        <DailyQuestionPopup
          token={token}
          onComplete={() => {
            setShowQuestionPopup(false);
            // Removed checkDailyQuestions - Daily Health Questions section removed
          }}
        />
      )}
        {/* Block main content ONLY if questions popup is actually showing */}
        <div className={`space-y-6 sm:space-y-8 px-2 sm:px-0 pb-20 lg:pb-0 ${showQuestionPopup && questionSession && !questionSession.completed ? 'pointer-events-none opacity-50' : ''}`}>
          {/* Hero Section with notification access */}
          <section className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 rounded-3xl p-5 sm:p-6 md:p-8 mt-4 shadow-2xl no-select">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full blur-2xl -ml-10 -mb-10"></div>
            
            <button
              onClick={handleNotificationBellClick}
              aria-label="View notifications"
              disabled={notificationsLoading}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-xl flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-90 transition-all duration-300 disabled:opacity-50 tap-highlight-none z-20"
            >
              {notificationsLoading ? (
                <Icon name="sync" size={22} className="text-white animate-spin" />
              ) : (
                <Icon name="notifications" size={22} className="text-white brightness-0 invert" />
              )}
              {!notificationsLoading && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-yellow-400 border-2 border-pink-600 animate-pulse" />
              )}
            </button>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
              <div className="flex-1 pr-12 md:pr-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest mb-2 sm:mb-3">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  Active Journey
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black !text-white mb-2 sm:mb-3 leading-tight tracking-tight">
                  Hi{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}! 👋
                  </h1>
                <p className="text-sm sm:text-base text-pink-50 font-medium mb-4 sm:mb-6 max-w-xl leading-relaxed opacity-90">
                  Your personalized pregnancy companion is ready to help you today.
                  </p>
                
                {weeksPregnant !== undefined && (
                  <div className="flex flex-wrap gap-2 sm:gap-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 sm:px-5 sm:py-3 border border-white/10 shadow-lg group hover:bg-white/20 transition-colors">
                      <p className="text-pink-100 text-[10px] font-bold uppercase tracking-wider mb-0.5 opacity-80">Pregnancy</p>
                      <p className="text-lg sm:text-xl font-black text-white">{weeksPregnant} <span className="text-xs sm:text-sm font-medium opacity-80">Weeks</span></p>
                      </div>
                      {daysLeft !== null && (
                      <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 sm:px-5 sm:py-3 border border-white/10 shadow-lg group hover:bg-white/20 transition-colors">
                        <p className="text-pink-100 text-[10px] font-bold uppercase tracking-wider mb-0.5 opacity-80">Countdown</p>
                        <p className="text-lg sm:text-xl font-black text-white">{daysLeft} <span className="text-xs sm:text-sm font-medium opacity-80">Days Left</span></p>
                        </div>
                      )}
                      
                      {activeRiskAssessment && (
                        <button
                          type="button"
                          onClick={handleEarlyRiskCardClick}
                          aria-label="View early risk details"
                          className={`bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 sm:px-5 sm:py-3 border border-white/10 shadow-lg group hover:bg-white/20 transition-all duration-300 relative overflow-hidden text-left cursor-pointer`}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-pink-100 text-[10px] font-bold uppercase tracking-wider opacity-80">Early Risk Detection</p>
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                              activeRiskAssessment.overallRisk === "high" ? "bg-red-400" : 
                              activeRiskAssessment.overallRisk === "medium" ? "bg-yellow-400" : "bg-green-400"
                            }`}></div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className={`text-lg sm:text-xl font-black uppercase tracking-tight ${
                              activeRiskAssessment.overallRisk === "high" ? "text-red-100" : 
                              activeRiskAssessment.overallRisk === "medium" ? "text-yellow-100" : "text-green-100"
                            }`}>
                              {activeRiskAssessment.overallRisk === "low" ? (lang === "bn" ? "নিম্ন" : "Low") :
                               activeRiskAssessment.overallRisk === "medium" ? (lang === "bn" ? "মধ্যম" : "Medium") :
                               (lang === "bn" ? "উচ্চ" : "High")}
                            </p>
                            <span className="text-[10px] font-bold text-white/60 bg-white/10 px-1.5 py-0.5 rounded-md border border-white/10">
                              {activeRiskAssessment.riskScore}%
                            </span>
                          </div>
                          {/* Subtle background glow based on risk */}
                          <div className={`absolute -right-2 -bottom-2 w-12 h-12 rounded-full blur-xl opacity-20 ${
                            activeRiskAssessment.overallRisk === "high" ? "bg-red-500" : 
                            activeRiskAssessment.overallRisk === "medium" ? "bg-yellow-500" : "bg-green-500"
                          }`}></div>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              
              <div className="hidden md:flex flex-shrink-0 relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full bg-white flex items-center justify-center shadow-2xl relative overflow-hidden group border-2 border-white/30">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 group-hover:translate-x-full transition-transform duration-1000"></div>
                  <Icon name="mom" size={80} className="group-hover:scale-110 transition-transform duration-500" />
                </div>
              </div>
            </div>
          </section>
          
          {/* Risk Alert Section - Only show when cards are visible */}
          {showCards && activeRiskAssessment && activeRiskAssessment.overallRisk !== "low" && (
            <div className={`p-4 rounded-3xl border-2 animate-in slide-in-from-top-4 duration-500 ${
              activeRiskAssessment.overallRisk === "high" 
                ? "bg-red-50 border-red-100 shadow-lg shadow-red-100/50" 
                : "bg-yellow-50 border-yellow-100 shadow-lg shadow-yellow-100/50"
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                  activeRiskAssessment.overallRisk === "high" ? "bg-red-500 text-white" : "bg-yellow-500 text-white"
                }`}>
                  <Icon name="warning" size={24} className="brightness-0 invert" />
                </div>
                <div className="flex-1">
                  <div className="mb-1">
                    <h3 className={`font-black uppercase tracking-wider text-sm ${
                      activeRiskAssessment.overallRisk === "high" ? "text-red-700" : "text-yellow-700"
                    }`}>
                      {activeRiskAssessment.overallRisk === "high" ? "Attention Required: High Risk" : "Notice: Medium Risk Detected"}
                    </h3>
                  </div>
                  <p className={`text-sm font-medium leading-relaxed ${
                    activeRiskAssessment.overallRisk === "high" ? "text-red-600/80" : "text-yellow-600/80"
                  }`}>
                    {activeRiskAssessment.recommendations[0]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEarlyRiskCardClick}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all active:scale-95 shadow-md hover:shadow-lg ${
                    activeRiskAssessment.overallRisk === "high"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-yellow-600 hover:bg-yellow-700 text-white"
                  }`}
                >
                  Full Report
                </button>
              </div>
            </div>
          )}

          <MessagePopup
            isOpen={popup.isOpen}
            onClose={() => setPopup({ ...popup, isOpen: false })}
            type={popup.type}
            title={popup.title}
            message={popup.message}
          />


          {/* Message Alert - For simple messages */}
          {message && !popup.isOpen && (
            <div className={`rounded-xl p-4 mb-6 border-2 shadow-md flex items-start gap-3 ${
              message.includes("successfully") || message.includes("Success") 
                ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-200" 
                : "bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border-red-200"
            }`}>
              <Icon 
                name={message.includes("successfully") || message.includes("Success") ? "success" : "error"} 
                size={24} 
                className="flex-shrink-0 mt-0.5"
              />
              <p className="flex-1 font-medium">{message}</p>
              <button
                onClick={() => setMessage("")}
                className="flex-shrink-0 text-neutral-400 hover:text-neutral-600"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
          )}

          {/* Quick navigation cards to replace tabs */}
          {showCards && (
            <section className="fade-in">
              <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                {navigationCards.map((card) => {
                  const CardContent = (
                    <div className="flex items-start gap-4 sm:gap-6 h-full">
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 ${card.icon === "warning.png" ? "rounded-full bg-yellow-100" : "rounded-2xl bg-gradient-to-br"} ${card.icon !== "warning.png" ? card.accent || "from-pink-500 to-rose-500" : ""} flex items-center justify-center shadow-xl flex-shrink-0 mt-1 group-hover:rotate-6 group-hover:scale-110 transition-all duration-300`}>
                        {card.icon === "warning.png" ? (
                          <Image src="/icons/warning.png" alt="Warning" width={32} height={32} className="sm:w-10 sm:h-10" />
                        ) : (
                          <Icon name={card.icon} size={28} className="sm:w-10 sm:h-10 brightness-0 invert" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <h3 className="text-xl sm:text-2xl font-black text-neutral-900 mb-1 group-hover:text-pink-600 transition-colors whitespace-normal leading-tight">
                          {card.title}
                        </h3>
                        <p className="text-neutral-600 text-sm sm:text-base opacity-80 whitespace-normal leading-relaxed">
                          {card.description}
                        </p>
                        </div>
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-all duration-300 transform group-hover:translate-x-1">
                        <span className="text-xl">→</span>
                      </div>
                    </div>
                  );

                  if (card.href) {
                    return (
                      <Link
                        key={card.id}
                        href={card.href}
                        className="group relative rounded-3xl bg-white border border-neutral-200 p-6 sm:p-8 shadow-sm hover:shadow-2xl hover:border-pink-200 transition-all duration-500 transform hover:-translate-y-2 active:scale-[0.97] tap-highlight-none overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        {CardContent}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={card.id}
                      onClick={() => {
                        if (card.action) card.action();
                      }}
                      className="group relative text-left rounded-3xl bg-white border border-neutral-200 p-6 sm:p-8 shadow-sm hover:shadow-2xl hover:border-pink-200 transition-all duration-500 transform hover:-translate-y-2 active:scale-[0.97] tap-highlight-none touch-manipulation overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      {CardContent}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

        {/* Tabs Content */}
        <div className="space-y-6">
          {activeTab && (
            <div className="flex items-center gap-4 mb-2">
              <button
                onClick={() => router.push("/mother/dashboard")}
                className="flex items-center gap-2 text-pink-600 font-bold hover:gap-3 transition-all active:scale-95 tap-highlight-none px-4 py-2 rounded-xl bg-pink-50"
              >
                <span className="text-xl">←</span>
                Back to Dashboard
              </button>
            </div>
          )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <DashboardCard title={t.mother.yourHealthProfile}>
            {profile && (
              <form className="space-y-4" onSubmit={saveProfile}>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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
                      Pregnancy Status
                    </label>
                    <select
                      className="input w-full"
                      value={profile.pregnancyStatus || ""}
                      onChange={(e) => setProfile({ ...profile, pregnancyStatus: e.target.value || undefined })}
                    >
                      <option value="">Select status</option>
                      <option value="not_pregnant">Not Pregnant</option>
                      <option value="pregnant">Pregnant</option>
                      <option value="recently_delivered">Recently Delivered</option>
                    </select>
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
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Location Type (from onboarding)
                    </label>
                    <select
                      className="input w-full"
                      value={profile.area === "urban" || profile.area === "semi_rural" || profile.area === "rural" ? profile.area : ""}
                      onChange={(e) => setProfile({ ...profile, area: e.target.value || undefined })}
                    >
                      <option value="">Select location type</option>
                      <option value="urban">Urban</option>
                      <option value="semi_rural">Semi-Rural</option>
                      <option value="rural">Rural</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      This field stores your location type from onboarding
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      City/Area (optional)
                    </label>
                    <select
                      className="input w-full"
                      value={AREA_OPTIONS.includes(profile.area || "") ? profile.area : ""}
                      onChange={(e) => {
                        // Only update if it's a city, don't overwrite location type
                        if (e.target.value) {
                          // Check if current area is a location type
                          const isLocationType = profile.area === "urban" || profile.area === "semi_rural" || profile.area === "rural";
                          if (!isLocationType) {
                            setProfile({ ...profile, area: e.target.value });
                          }
                        }
                      }}
                    >
                      <option value="">Select city (optional)</option>
                      {AREA_OPTIONS.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Optional: Select your city for doctor recommendations
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t.mother.address}
                  </label>
                  <textarea
                    className="input w-full h-20"
                    placeholder={lang === "bn" ? "উদাহরণ: বাড়ি ১২৩, রোড ৪৫, এলাকা/পাড়া, শহর, বিভাগ/রাজ্য, দেশ (যেমন: ঢাকা, বাংলাদেশ)" : "Example: House 123, Road 45, Area/Neighborhood, City, Division/State, Country (e.g., Dhaka, Bangladesh)"}
                    value={profile.address || ""}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    💡 Tip: Include your area, city, division/state, and country. This helps us suggest foods and exercises available in your location.
                  </p>
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
                <button type="submit" className="btn-primary flex items-center gap-2 w-full sm:w-auto touch-manipulation min-h-[44px] justify-center sm:justify-start" disabled={loading}>
                  {loading ? t.common.loading : (
                    <>
                      <Icon name="save" size={18} />
                      {t.common.save} {t.mother.profile}
                    </>
                  )}
                </button>
              </form>
            )}
          </DashboardCard>
        )}

          {/* Prescriptions Tab */}
          {activeTab === "prescriptions" && (
            <DashboardCard title={t.mother.prescriptions}>
              <div className="space-y-6">
                <div className="rounded-xl border-2 border-dashed border-pink-300 bg-gradient-to-br from-pink-50 to-rose-50 p-4 sm:p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                  <form onSubmit={uploadPrescription} className="space-y-4">
                    <div className="text-center mb-4 sm:mb-6">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center shadow-lg">
                        <Icon name="upload" size={32} className="sm:w-10 sm:h-10 text-white" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-neutral-900 mb-2">Upload Prescription for Better AI Guidance</h3>
                      <p className="text-xs sm:text-sm text-neutral-600">
                        Drag and drop your prescription file here, or click to browse
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Supported formats: PDF, PNG, JPG (Max 10MB)
                      </p>
                    </div>
                    
                    {/* Upload Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <label className="flex flex-col items-center justify-center p-4 sm:p-5 border-2 border-pink-300 rounded-lg cursor-pointer hover:bg-pink-50 transition-colors touch-manipulation min-h-[100px] sm:min-h-[120px]">
                        <Icon name="upload" size={24} className="text-pink-600 mb-2" />
                        <span className="text-sm font-medium text-neutral-700 text-center">Choose File</span>
                        <input
                          type="file"
                          name="file"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg"
                          disabled={uploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedFile(file);
                              setMessage(`✅ File selected successfully: ${file.name}`);
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={startCamera}
                        disabled={uploading || showCamera}
                        className="flex flex-col items-center justify-center p-4 sm:p-5 border-2 border-pink-300 rounded-lg cursor-pointer hover:bg-pink-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[100px] sm:min-h-[120px]"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-pink-600 mb-2">
                          <path d="M9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17Z" fill="currentColor"/>
                        </svg>
                        <span className="text-sm font-medium text-neutral-700 text-center">Take Photo</span>
                      </button>
                    </div>
                    
                    {/* Selected File Display */}
                    {selectedFile && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Icon name="prescription" size={20} className="text-green-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-green-800 truncate" title={selectedFile.name}>
                            {selectedFile.name}
                          </span>
                          <span className="text-xs text-green-600 flex-shrink-0">
                            ({(selectedFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            setMessage("");
                            const fileInput = document.querySelector('input[name="file"]') as HTMLInputElement;
                            if (fileInput) fileInput.value = "";
                          }}
                          className="text-green-600 hover:text-green-800 p-1 flex-shrink-0"
                          aria-label="Remove file"
                        >
                          <Icon name="close" size={18} />
                        </button>
                      </div>
                    )}
                    
                    <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 py-3 sm:py-4 text-base sm:text-lg font-semibold touch-manipulation min-h-[44px]" disabled={uploading || !selectedFile}>
                      {uploading ? (
                        <>
                          <Icon name="pending" size={20} />
                          {t.common.loading}
                        </>
                      ) : (
                        <>
                          <Icon name="upload" size={20} />
                          Upload Prescription
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Camera Modal */}
                {showCamera && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-2 sm:p-4">
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-auto">
                      <div className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg sm:text-xl font-bold text-neutral-900">Take Prescription Photo</h3>
                          <button
                            onClick={stopCamera}
                            className="text-neutral-500 hover:text-neutral-700 p-2 -mr-2 touch-manipulation"
                            aria-label="Close camera"
                          >
                            <Icon name="close" size={24} />
                          </button>
                        </div>
                        
                        {!capturedImage ? (
                          <div className="space-y-4">
                            <div className="relative bg-black rounded-lg overflow-hidden">
                              <video
                                id="camera-video"
                                autoPlay
                                playsInline
                                className="w-full h-auto max-h-[50vh] sm:max-h-[60vh]"
                                ref={(video) => {
                                  if (video && cameraStream) {
                                    video.srcObject = cameraStream;
                                  }
                                }}
                              />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button
                                onClick={capturePhoto}
                                className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 sm:py-3 text-base sm:text-lg font-semibold touch-manipulation min-h-[44px]"
                              >
                                <svg width="20" height="20" className="sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17Z" fill="currentColor"/>
                                </svg>
                                Capture Photo
                              </button>
                              <button
                                onClick={stopCamera}
                                className="btn-secondary flex items-center justify-center gap-2 py-3 px-6 touch-manipulation min-h-[44px]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="relative bg-black rounded-lg overflow-hidden">
                              <img
                                src={capturedImage}
                                alt="Captured prescription"
                                className="w-full h-auto max-h-[50vh] sm:max-h-[60vh] mx-auto"
                              />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button
                                onClick={uploadCapturedImage}
                                disabled={uploading}
                                className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 text-base sm:text-lg font-semibold disabled:opacity-50 touch-manipulation min-h-[44px]"
                              >
                                {uploading ? (
                                  <>
                                    <Icon name="pending" size={20} />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Icon name="upload" size={20} />
                                    Upload Photo
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setCapturedImage(null);
                                }}
                                className="btn-secondary flex items-center justify-center gap-2 py-3 px-4 sm:px-6 touch-manipulation min-h-[44px]"
                                disabled={uploading}
                              >
                                Retake
                              </button>
                              <button
                                onClick={stopCamera}
                                className="btn-secondary flex items-center justify-center gap-2 py-3 px-4 sm:px-6 touch-manipulation min-h-[44px]"
                                disabled={uploading}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold mb-4 text-neutral-900 flex items-center gap-2">
                    <Icon name="prescription" size={24} className="text-pink-600" />
                    Your Prescriptions ({prescriptions.length})
                  </h3>
                  {prescriptions.length === 0 ? (
                    <div className="text-center py-12 text-neutral-500 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50">
                      <Icon name="prescription" size={48} className="mx-auto mb-3 text-neutral-300" />
                      <p className="text-lg font-medium mb-2">{t.mother.noPrescriptions}</p>
                      <p className="text-sm">{t.mother.uploadPrescription}</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                      {prescriptions
                        .filter((p) => p && p.key && p.url) // Filter out invalid items before mapping
                        .map((p) => {
                        const fileName = p.key.split("/").pop() || "prescription";
                        const displayName = (p.customName && p.customName.trim()) || fileName;
                        const isPdf = p.isPdf === true || p.key.endsWith('.pdf');
                        const hasImages = Array.isArray(p.imageUrls) && p.imageUrls.length > 0;
                        const isRenaming = renamingPrescription === p.key;
                        return (
                          <div
                            key={p.key}
                            className="group relative bg-white rounded-xl border-2 border-neutral-200 hover:border-pink-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
                          >
                            {/* Card Content */}
                            <div className="p-5">
                              {/* Header Section */}
                              <div className="flex items-start gap-4 mb-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                                  <Icon name="prescription" size={28} className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  {isRenaming ? (
                                    <div className="space-y-3">
                                      <input
                                        type="text"
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            safeAsync(async () => {
                                              const encodedKey = encodeURIComponent(p.key);
                                              const res = await fetch(`/api/mother/prescriptions/${encodedKey}`, {
                                                method: "PATCH",
                                                headers: {
                                                  "Content-Type": "application/json",
                                                  ...authHeaders(),
                                                },
                                                body: JSON.stringify({ customName: renameValue }),
                                              });
                                              if (res.ok) {
                                                setMessage("✅ Prescription renamed successfully");
                                                fetchPrescriptions();
                                                setRenamingPrescription(null);
                                                setRenameValue("");
                                              } else {
                                                const data = await res.json().catch(() => ({}));
                                                setMessage(`❌ ${data.error || "Failed to rename prescription"}`);
                                              }
                                            })();
                                          } else if (e.key === "Escape") {
                                            setRenamingPrescription(null);
                                            setRenameValue("");
                                          }
                                        }}
                                        autoFocus
                                        className="w-full px-4 py-2.5 border-2 border-pink-400 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                        placeholder="Enter new name..."
                                        maxLength={100}
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={safeAsync(async () => {
                                            const encodedKey = encodeURIComponent(p.key);
                                            const res = await fetch(`/api/mother/prescriptions/${encodedKey}`, {
                                              method: "PATCH",
                                              headers: {
                                                "Content-Type": "application/json",
                                                ...authHeaders(),
                                              },
                                              body: JSON.stringify({ customName: renameValue }),
                                            });
                                            if (res.ok) {
                                              setMessage("✅ Prescription renamed successfully");
                                              fetchPrescriptions();
                                              setRenamingPrescription(null);
                                              setRenameValue("");
                                            } else {
                                              const data = await res.json().catch(() => ({}));
                                              setMessage(`❌ ${data.error || "Failed to rename prescription"}`);
                                            }
                                          })}
                                          className="btn-primary px-4 py-2 text-sm font-medium"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => {
                                            setRenamingPrescription(null);
                                            setRenameValue("");
                                          }}
                                          className="btn-secondary px-4 py-2 text-sm font-medium"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <h4 className="font-semibold text-lg text-slate-900 mb-1 break-words">{displayName}</h4>
                                      {p.customName && p.customName.trim() && (
                                        <p className="text-xs text-slate-400 mb-2 italic">Original: {fileName}</p>
                                      )}
                                      <div className="flex items-center gap-2 text-xs text-slate-500">
                                        {isPdf && (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">
                                            <Icon name="prescription" size={12} />
                                            PDF
                                          </span>
                                        )}
                                        {hasImages && (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md font-medium">
                                            <Icon name="view" size={12} />
                                            {p.pageCount || (Array.isArray(p.imageUrls) ? p.imageUrls.length : 0)} page(s)
                                          </span>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              {!isRenaming && (
                                <div className="flex flex-wrap gap-2 pt-4 border-t border-neutral-100">
                                  <a
                                    href={p.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary px-3 py-1.5 text-xs font-medium flex items-center justify-center gap-1.5 hover:shadow-md transition-shadow"
                                  >
                                    <Icon name="view" size={14} />
                                    <span>{isPdf ? "View PDF" : "View"}</span>
                                  </a>
                                  {hasImages && (
                                    <button
                                      onClick={safeAsync(async () => {
                                        if (p.imageUrls && p.imageUrls.length > 0) {
                                          const imageUrls = Array.isArray(p.imageUrls) ? p.imageUrls : [];
                                          if (imageUrls.length === 0) {
                                            setMessage("❌ No images available");
                                            return;
                                          }
                                          const imagesHtml = imageUrls.map((url, idx) => 
                                            `<div style="margin-bottom: 30px; text-align: center;">
                                              <h3 style="margin-bottom: 10px; color: #333; font-size: 18px;">Page ${idx + 1} of ${imageUrls.length}</h3>
                                              <img src="${url}" style="max-width: 100%; border: 2px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                                            </div>`
                                          ).join('');
                                          const newWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes');
                                          if (newWindow) {
                                            newWindow.document.write(`
                                              <!DOCTYPE html>
                                              <html>
                                                <head>
                                                  <title>${displayName} - Converted Images</title>
                                                  <style>
                                                    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                                                    h1 { color: #333; margin-bottom: 10px; }
                                                    p { color: #666; margin-bottom: 20px; }
                                                  </style>
                                                </head>
                                                <body>
                                                  <h1>${displayName}</h1>
                                                  <p><strong>${imageUrls.length} page(s)</strong> converted to images</p>
                                                  ${imagesHtml}
                                                </body>
                                              </html>
                                            `);
                                            newWindow.document.close();
                                          }
                                        }
                                      })}
                                      className="btn-secondary px-3 py-1.5 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-pink-50 hover:border-pink-300 transition-colors"
                                    >
                                      <Icon name="view" size={14} />
                                      <span>Images</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setRenamingPrescription(p.key);
                                      setRenameValue(p.customName || fileName);
                                    }}
                                    className="btn-secondary px-3 py-1.5 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-pink-50 hover:border-pink-300 transition-colors"
                                    title="Rename prescription"
                                  >
                                    <Icon name="edit" size={14} />
                                    <span className="hidden sm:inline">Rename</span>
                                  </button>
                                  <button
                                    onClick={safeAsync(async () => {
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
                                    })}
                                    disabled={deletingPrescription === p.key}
                                    className="btn-secondary px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border-red-200 hover:bg-red-100 disabled:opacity-50 flex items-center justify-center transition-colors"
                                    title="Delete prescription"
                                  >
                                    {deletingPrescription === p.key ? (
                                      <span className="text-xs">...</span>
                                    ) : (
                                      <Icon name="delete" size={14} />
                                    )}
                                  </button>
                                </div>
                              )}
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

          {/* Doctor Consultation Tab */}
          {activeTab === "consultation" && (
            <div className="space-y-6">
              <DashboardCard title={
                <span className="flex items-center gap-2">
                  <Icon name="doctor" size={20} />
                  Doctor Consultation
                </span>
              }>
                <div className="space-y-6">
                  {/* Request New Consultation */}
                  <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Icon name="doctor" size={24} />
                      Request Consultation
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Enter your doctor's 8-digit reference number to request a consultation. Once approved, you can share your medical details and message directly with your doctor.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        className="input flex-1"
                        placeholder="Enter 8-digit Reference Number (e.g., 12345678)"
                        value={consultationReference || ""}
                        onChange={(e) => {
                          // Only allow digits and limit to 8 characters
                          const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                          setConsultationReference(value);
                        }}
                        disabled={consultationLoading}
                        maxLength={8}
                      />
                      <button
                        className="btn-primary whitespace-nowrap min-h-[44px]"
                        onClick={requestConsultation}
                        disabled={!consultationReference?.trim() || consultationReference.length !== 8 || consultationLoading}
                      >
                        {consultationLoading ? (
                          <span className="flex items-center gap-2">
                            <Icon name="sync" size={18} className="animate-spin" />
                            Sending...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Icon name="submit" size={18} />
                            Request Consultation
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* My Consultations */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Icon name="doctor" size={24} />
                      My Consultations ({consultations.length})
                    </h3>
                    {consultations.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                        <Icon name="doctor" size={48} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-lg font-medium mb-2">No consultations yet</p>
                        <p className="text-sm">Request a consultation with your doctor to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {consultations.map((consultation) => (
                          <div
                            key={consultation.id}
                            className={`rounded-xl border-2 p-5 ${
                              consultation.status === "approved"
                                ? "border-green-200 bg-green-50"
                                : consultation.status === "pending"
                                ? "border-yellow-200 bg-yellow-50"
                                : "border-red-200 bg-red-50"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-slate-800">
                                    {consultation.doctor?.name || "Doctor"}
                                  </h4>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    consultation.status === "approved"
                                      ? "bg-green-100 text-green-700"
                                      : consultation.status === "pending"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-red-100 text-red-700"
                                  }`}>
                                    {consultation.status === "approved" ? "Approved" : consultation.status === "pending" ? "Pending" : "Rejected"}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600">
                                  Reference: {consultation.doctorReferenceNumber || consultation.doctor?.referenceNumber || (consultation as any).doctorBmdcNumber || "N/A"}
                                </p>
                                {consultation.doctor?.specialty && (
                                  <p className="text-sm text-slate-500 mt-1">
                                    {consultation.doctor.specialty}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              {consultation.status === "approved" && (
                                <button
                                  className="btn-primary flex-1 text-sm min-h-[44px]"
                                  onClick={() => openConsultationChat(consultation.id)}
                                >
                                  <span className="flex items-center gap-2 justify-center">
                                    <Icon name="chat" size={16} />
                                    Message Doctor
                                  </span>
                                </button>
                              )}
                              <button
                                className="btn-secondary text-sm min-h-[44px] bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                onClick={() => removeConsultation(consultation.id)}
                                disabled={loading}
                              >
                                <span className="flex items-center gap-2 justify-center">
                                  <Icon name="delete" size={16} />
                                  Remove
                                </span>
                              </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-3">
                              Requested on {new Date(consultation.requestedAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Book Consultation Slots */}
                  {consultations.filter(c => c.status === "approved").length > 0 && (
                    <div className="mt-6">
                      <PatientBooking 
                        token={token} 
                        connectedDoctors={consultations
                          .filter(c => c.status === "approved" && c.doctor)
                          .map(c => ({
                            id: c.doctorId,
                            name: c.doctor.name,
                            specialty: c.doctor.specialty,
                          }))
                        } 
                      />
                    </div>
                  )}
                </div>
              </DashboardCard>
            </div>
          )}

          {/* Consultation Chat Modal */}
          {selectedConsultation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
              <div className="bg-white rounded-lg sm:rounded-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 sm:p-6 border-b">
                  <h2 className="text-xl sm:text-2xl font-bold">Consultation Chat</h2>
                  <button
                    onClick={() => {
                      setSelectedConsultation(null);
                      setConsultationMessages([]);
                      setNewMessage("");
                    }}
                    className="text-slate-500 hover:text-slate-700 p-2"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                  {consultationMessages.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    consultationMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderRole === "mother" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.senderRole === "mother"
                              ? "bg-blue-500 text-white"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <p className={`text-xs mt-1 ${
                            msg.senderRole === "mother" ? "text-blue-100" : "text-slate-500"
                          }`}>
                            {new Date(msg.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 sm:p-6 border-t">
                  <div className="flex gap-2">
                    <textarea
                      className="input flex-1 min-h-[60px]"
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendConsultationMessage();
                        }
                      }}
                    />
                    <button
                      className="btn-primary whitespace-nowrap min-h-[60px]"
                      onClick={sendConsultationMessage}
                      disabled={!newMessage.trim()}
                    >
                      <Icon name="submit" size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Questions Tab - REMOVED - Code removed */}
          {false && (
            <div className="space-y-6">
              <DashboardCard title={t.mother.askDoctor}>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-neutral-900">Ask a Question</h3>
                    <button 
                      className="btn-primary flex items-center gap-2 px-4 sm:px-6 py-2.5 touch-manipulation min-h-[44px] w-full sm:w-auto"
                      onClick={() => {
                        const textarea = document.querySelector('textarea');
                        if (textarea) textarea.focus();
                      }}
                    >
                      <Icon name="question" size={18} />
                      <span className="text-sm sm:text-base">Ask a Question</span>
                    </button>
                  </div>
                  <textarea
                    className="input w-full h-32 sm:h-36 text-base"
                    placeholder={t.mother.questionPlaceholder}
                    value=""
                    onChange={() => {}}
                    disabled={true}
                  />
                  <button className="btn-primary w-full flex items-center gap-2 justify-center py-3 sm:py-4 text-base sm:text-lg font-semibold touch-manipulation min-h-[44px]" onClick={() => {}} disabled={true}>
                    {loading ? t.common.loading : (
                      <>
                        <Icon name="submit" size={20} />
                        {t.common.submit} {t.mother.questions.split(" ")[0]}
                      </>
                    )}
                  </button>
                  <p className="text-sm text-slate-600 flex items-start gap-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <Icon name="info" size={18} className="mt-0.5 text-blue-600 flex-shrink-0" />
                    <span><strong>Tip:</strong> Include details about symptoms, timing, and any concerns you have for better answers.</span>
                  </p>
                </div>
              </DashboardCard>

              <DashboardCard title={t.mother.yourQuestions}>
                {true ? (
                  <div className="text-center py-12 text-neutral-500 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50">
                    <Icon name="question" size={48} className="mx-auto mb-3 text-neutral-300" />
                    <p className="text-lg font-medium mb-2">{t.mother.noQuestions}</p>
                    <p className="text-sm">{t.mother.askDoctor}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Answered Questions - Grid View */}
                    {false && (
                      <div>
                        <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
                          <Icon name="success" size={24} />
                          Answered Questions (0)
                        </h3>
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                        {[].map((q: any) => {
                          const isReported = q.reported || q.reportStatus === "pending";
                          return (
                            <div
                              key={q.id}
                              className={`rounded-xl border-2 p-5 relative shadow-sm hover:shadow-md transition-all ${
                                isReported 
                                  ? "border-orange-300 bg-orange-50" 
                                  : "border-green-200 bg-green-50"
                              }`}
                            >
                              {/* Reported Badge */}
                              {isReported && (
                                <div className="absolute top-3 right-3 px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-md">
                                  <Icon name="report" size={14} />
                                  Reported
                                </div>
                              )}
                              {/* Notification Badge */}
                              {q.hasNewActivity && !isReported && (
                                <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                              )}
                              <div className="flex items-start justify-between mb-2">
                                <p className="font-medium text-slate-700 line-clamp-2 flex-1">{q.question}</p>
                              </div>
                              <p className="text-xs text-slate-500 mb-3">
                                {new Date(q.createdAt).toLocaleDateString()}
                              </p>
                              <div className={`mt-2 rounded p-2 mb-3 ${
                                isReported ? "bg-orange-100" : "bg-white"
                              }`}>
                                <p className={`text-xs font-medium mb-1 flex items-center gap-1 ${
                                  isReported ? "text-orange-700" : "text-green-700"
                                }`}>
                                  <Icon name="doctor" size={14} />
                                  Answer:
                                </p>
                                <p className="text-sm text-slate-700 line-clamp-2">{q.answer}</p>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                  className="btn-secondary flex-1 text-sm touch-manipulation min-h-[44px]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Clear any pending timeout
                                    if (commentTimeoutRef.current) {
                                      clearTimeout(commentTimeoutRef.current);
                                    }
                                    // Mark as seen
                                    fetch(`/api/mother/questions/${q.id}/mark-seen`, {
                                      method: "POST",
                                      headers: authHeaders(),
                                    });
                                    // Show full details in modal
                                    setSelectedQuestion(q);
                                    // Force refresh comments after a short delay to ensure they load
                                    commentTimeoutRef.current = setTimeout(() => {
                                      // Only update if modal is still open (selectedQuestion is still set)
                                      setSelectedQuestion((current) => {
                                        if (current && current.id === q.id) {
                                          fetch(`/api/questions/comments?questionId=${q.id}`, { 
                                            headers: authHeaders() 
                                          })
                                            .then(r => r.json())
                                            .then(d => {
                                              if (d.comments) {
                                                setSelectedQuestion((prev) => {
                                                  // Double check modal is still open
                                                  if (prev && prev.id === q.id) {
                                                    return { ...prev, comments: d.comments };
                                                  }
                                                  return prev;
                                                });
                                              }
                                            })
                                            .catch(err => console.error("Failed to load comments:", err));
                                        }
                                        return current;
                                      });
                                    }, 100);
                                  }}
                                >
                                  <span className="flex items-center gap-1">
                                    <Icon name="view" size={16} />
                                    View Full Details
                                  </span>
                                </button>
                                {q.answer && (
                                  <button
                                    className={`text-sm px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1 touch-manipulation min-h-[44px] ${
                                      isReported
                                        ? "bg-orange-500 hover:bg-orange-600 text-white cursor-not-allowed"
                                        : "bg-red-500 hover:bg-red-600 text-white"
                                    }`}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (isReported) {
                                        setPopup({
                                          isOpen: true,
                                          type: "info",
                                          title: "Already Reported",
                                          message: "This question has already been reported. Admin will review it soon.",
                                        });
                                        return;
                                      }
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
                                            setPopup({
                                              isOpen: true,
                                              type: "success",
                                              title: "Report Submitted",
                                              message: "Report submitted successfully. Admin will review it.",
                                            });
                                            fetchQuestions();
                                          } else {
                                            setPopup({
                                              isOpen: true,
                                              type: "error",
                                              title: "Report Failed",
                                              message: "Failed to submit report. Please try again.",
                                            });
                                          }
                                        } catch (err) {
                                          setPopup({
                                            isOpen: true,
                                            type: "error",
                                            title: "Network Error",
                                            message: "Network error. Please try again.",
                                          });
                                        }
                                      }
                                    }}
                                    disabled={isReported}
                                  >
                                    <Icon name="report" size={16} />
                                    {isReported ? "Reported" : "Report"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                    {/* Unanswered Questions - List View */}
                    {false && (
                      <div className="mt-6">
                        <h3 className="text-xl font-bold text-yellow-700 mb-4 flex items-center gap-2">
                          <Icon name="pending" size={24} />
                          Pending Questions (0)
                        </h3>
                      <div className="space-y-3">
                        {[].map((q: any) => (
                          <div
                            key={q.id}
                            className="rounded-xl border-2 border-yellow-300 bg-yellow-50 p-5 relative shadow-sm hover:shadow-md transition-all"
                          >
                            {/* Notification Badge */}
                            {q.hasNewActivity && (
                              <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                            )}
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-medium text-slate-700 flex-1">{q.question}</p>
                              <span className="text-xs text-slate-500 ml-2">
                                {new Date(q.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-yellow-700">
                                <Icon name="pending" size={20} />
                                <span>{t.mother.waiting}</span>
                              </div>
                              <button
                                className="btn-secondary text-sm px-3 py-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Clear any pending timeout
                                  if (commentTimeoutRef.current) {
                                    clearTimeout(commentTimeoutRef.current);
                                  }
                                  // Mark as seen
                                  fetch(`/api/mother/questions/${q.id}/mark-seen`, {
                                    method: "POST",
                                    headers: authHeaders(),
                                  });
                                  // Show full details in modal
                                  setSelectedQuestion(q);
                                  // Force refresh comments after a short delay to ensure they load
                                  commentTimeoutRef.current = setTimeout(() => {
                                    // Only update if modal is still open (selectedQuestion is still set)
                                    setSelectedQuestion((current) => {
                                      if (current && current.id === q.id) {
                                        fetch(`/api/questions/comments?questionId=${q.id}`, { 
                                          headers: authHeaders() 
                                        })
                                          .then(r => r.json())
                                          .then(d => {
                                            if (d.comments) {
                                              setSelectedQuestion((prev) => {
                                                // Double check modal is still open
                                                if (prev && prev.id === q.id) {
                                                  return { ...prev, comments: d.comments };
                                                }
                                                return prev;
                                              });
                                            }
                                          })
                                          .catch(err => console.error("Failed to load comments:", err));
                                      }
                                      return current;
                                    });
                                  }, 100);
                                }}
                              >
                                <span className="flex items-center gap-1">
                                  <Icon name="view" size={16} />
                                  View Details
                                </span>
                              </button>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-lg sm:rounded-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl sm:text-2xl font-bold">Question Details</h2>
                <button
                  onClick={() => {
                    // Clear any pending timeout
                    if (commentTimeoutRef.current) {
                      clearTimeout(commentTimeoutRef.current);
                      commentTimeoutRef.current = null;
                    }
                    setSelectedQuestion(null);
                    fetchQuestions();
                  }}
                  className="text-slate-500 hover:text-slate-700 p-2 -mr-2 touch-manipulation"
                  aria-label="Close"
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
                  <div className={`rounded-lg border p-4 ${
                    selectedQuestion.reported || selectedQuestion.reportStatus === "pending"
                      ? "bg-orange-50 border-orange-200"
                      : "bg-green-50 border-green-200"
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <p className={`text-sm font-medium flex items-center gap-1 ${
                        selectedQuestion.reported || selectedQuestion.reportStatus === "pending"
                          ? "text-orange-700"
                          : "text-green-700"
                      }`}>
                        <Icon name="doctor" size={16} />
                        Doctor's Answer
                        {(selectedQuestion.reported || selectedQuestion.reportStatus === "pending") && (
                          <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs font-semibold rounded-full">
                            Reported
                          </span>
                        )}
                      </p>
                      {(() => {
                        const isReported = selectedQuestion.reported || selectedQuestion.reportStatus === "pending";
                        return (
                          <button
                            className={`text-xs px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                              isReported
                                ? "bg-orange-500 hover:bg-orange-600 text-white cursor-not-allowed"
                                : "bg-red-500 hover:bg-red-600 text-white"
                            }`}
                            onClick={safeAsync(async () => {
                              if (isReported) {
                                setPopup({
                                  isOpen: true,
                                  type: "info",
                                  title: "Already Reported",
                                  message: "This question has already been reported. Admin will review it soon.",
                                });
                                return;
                              }
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
                                    setPopup({
                                      isOpen: true,
                                      type: "success",
                                      title: "Report Submitted",
                                      message: "Report submitted successfully. Admin will review it.",
                                    });
                                    setSelectedQuestion(null);
                                    fetchQuestions();
                                  } else {
                                    setPopup({
                                      isOpen: true,
                                      type: "error",
                                      title: "Report Failed",
                                      message: "Failed to submit report. Please try again.",
                                    });
                                  }
                                } catch (err) {
                                  setPopup({
                                    isOpen: true,
                                    type: "error",
                                    title: "Network Error",
                                    message: "Network error. Please try again.",
                                  });
                                }
                              }
                            })}
                            disabled={isReported}
                          >
                            <Icon name="report" size={14} />
                            {isReported ? "Reported" : "Report"}
                          </button>
                        );
                      })()}
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
                      comments={selectedQuestion.comments || []}
                      onCommentAdded={async () => {
                        // Refresh questions list
                        await fetchQuestions(token);
                        // Refresh selected question with latest comments
                        try {
                          const res = await fetch(`/api/mother/questions`, { headers: authHeaders() });
                          const data = await res.json();
                          const updated = data.questions?.find((q: any) => q.id === selectedQuestion.id);
                          if (updated) {
                            setSelectedQuestion({ ...updated, comments: updated.comments || [] });
                          }
                        } catch (err) {
                          console.error("Failed to refresh question:", err);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Daily Routine Tab */}
        {activeTab === "food" && (
          <div className="space-y-6">
            <FoodRecommendations token={token} motherId={motherId} />
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === "progress" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <DashboardCard title="Risk Report">
              {progress ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Progress Info */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Journey Progress</h3>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold text-slate-700">
                          {progress.days 
                            ? `${Math.floor(progress.days / 7)} weeks ${progress.days % 7} days`
                            : `Week ${progress.weeks}`
                          }
                        </span>
                        <span className="text-pink-600 font-bold">{Math.round(progress.percentage)}% Complete</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden mb-4 border border-slate-200">
                        <div
                          className="bg-gradient-to-r from-pink-500 to-rose-500 h-4 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 text-center italic">
                        Estimated {progress.total - progress.weeks} weeks remaining until your due date
                      </p>
                    </div>

                    {profile?.daysPregnant && (
                      <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 p-6 border border-pink-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-pink-200/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                        <p className="text-sm font-bold text-pink-700 mb-2 flex items-center gap-2">
                          <Icon name="pregnancy-progress" size={18} />
                          Pregnancy Milestones
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-2xl font-black text-pink-900 leading-none">
                              {Math.floor((profile.daysPregnant || 0) / 7)}
                            </p>
                            <p className="text-[10px] uppercase font-bold text-pink-600 tracking-wider">Weeks</p>
                          </div>
                          <div>
                            <p className="text-2xl font-black text-pink-900 leading-none">
                              {Math.floor((profile.daysPregnant || 0) / 30)}
                            </p>
                            <p className="text-[10px] uppercase font-bold text-pink-600 tracking-wider">Months</p>
                          </div>
                        </div>
                        <p className="text-sm text-pink-700/80 font-medium mt-4 pt-4 border-t border-pink-200/50">
                          Total Journey: {profile.daysPregnant} days
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Risk Analysis */}
                  <div className="space-y-6">
                    {activeRiskAssessment && (() => {
                      const riskColors: Record<"low" | "medium" | "high", string> = {
                        low: "bg-green-50 text-green-700 border-green-100",
                        medium: "bg-yellow-50 text-yellow-700 border-yellow-100",
                        high: "bg-red-50 text-red-700 border-red-100",
                      };
                      const riskLevel = activeRiskAssessment.overallRisk as "low" | "medium" | "high";
                      const riskPercentage = activeRiskAssessment.riskScore;

                      // Calculate contribution from each category
                      const categoryContributions: Record<string, number> = {};
                      activeRiskAssessment.riskFactors.forEach((factor) => {
                        const category = factor.category || "Other";
                        if (!categoryContributions[category]) {
                          categoryContributions[category] = 0;
                        }
                        const contribution = factor.points || 0;
                        categoryContributions[category] += contribution;
                      });

                      return (
                        <div id="early-risk-section" className={`rounded-2xl border-2 p-6 shadow-sm transition-all duration-500 ${riskColors[riskLevel]}`}>
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-70 flex items-center gap-2">
                              <Icon name="warning" size={16} />
                              Health Risk Analysis
                            </p>
                            <div className="px-3 py-1 rounded-full bg-white/50 backdrop-blur-sm text-[10px] font-bold border border-current/10">
                              AI EVALUATED
                            </div>
                          </div>
                          
                          <div className="flex items-baseline gap-2 mb-1">
                            <p className="text-3xl font-black capitalize tracking-tight">
                              {activeRiskAssessment.overallRisk} Risk
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mb-6">
                            <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden border border-black/5">
                              <div 
                                className="h-full bg-current transition-all duration-1000"
                                style={{ width: `${riskPercentage}%` }}
                              />
                            </div>
                            <span className="text-xs font-black min-w-[3rem] text-right">{riskPercentage}%</span>
                          </div>

                          {/* Risk Breakdown */}
                          {Object.keys(categoryContributions).length > 0 && (
                            <div className="space-y-4 mb-6 pt-4 border-t border-current/10">
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Risk Components</p>
                              <div className="grid gap-3">
                                {Object.entries(categoryContributions)
                                  .sort(([, a], [, b]) => b - a)
                                  .map(([category, contribution]) => {
                                    const percentage = Math.min(Math.round((contribution / 100) * 100), 100);
                                    if (percentage === 0) return null;
                                    return (
                                      <div key={category} className="space-y-1">
                                        <div className="flex items-center justify-between text-[11px] font-bold">
                                          <span className="opacity-80">{category}</span>
                                          <span>{percentage}%</span>
                                        </div>
                                        <div className="w-full bg-current/10 rounded-full h-1">
                                          <div
                                            className="bg-current h-1 rounded-full opacity-60 transition-all duration-700"
                                            style={{ width: `${percentage}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {activeRiskAssessment.riskFactors.length > 0 && (
                            <div className="space-y-3 mb-6 pt-4 border-t border-current/10">
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Detected Signals</p>
                              <div className="flex flex-wrap gap-2">
                                {activeRiskAssessment.riskFactors.map((factor) => {
                                  const isDismissible = factor.source === "symptoms";
                                  return isDismissible ? (
                                    <button
                                      key={getRiskKey(factor)}
                                      type="button"
                                      onClick={() => handleDismissRiskFactor(factor)}
                                      className="inline-flex items-center gap-2 rounded-xl bg-white/40 hover:bg-white/60 border border-current/20 px-3 py-1.5 text-[11px] font-bold transition-all active:scale-95 group/chip"
                                      title="Clear symptom-based risk"
                                    >
                                      <span className="truncate max-w-[140px]">{factor.factor}</span>
                                      <span className="text-lg leading-none opacity-40 group-hover/chip:opacity-100 transition-opacity">×</span>
                                    </button>
                                  ) : (
                                    <div
                                      key={getRiskKey(factor)}
                                      className="inline-flex items-center gap-2 rounded-xl bg-white/30 border border-current/20 px-3 py-1.5 text-[11px] font-bold"
                                      title="Profile-based risk (update your health profile to change)"
                                    >
                                      <span className="truncate max-w-[140px]">{factor.factor}</span>
                                      <span className="text-xs opacity-40">🔒</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="pt-4 border-t border-current/10">
                            <div className="bg-white/30 backdrop-blur-sm rounded-xl p-4 border border-current/5">
                              <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">AI Insight & Actions</p>
                              <p className="text-sm font-medium leading-relaxed mb-3">
                                {aiEarlyRiskSummary?.whySummary || "Early risk insight will appear after data is analyzed."}
                              </p>
                              {aiEarlyRiskSummary?.actionItems && (
                                <div className="space-y-2">
                                  {aiEarlyRiskSummary.actionItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 text-[11px] font-bold leading-tight items-start">
                                      <span className="w-1.5 h-1.5 rounded-full bg-current mt-1 flex-shrink-0"></span>
                                      <span className="opacity-80">{item}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 max-w-sm mx-auto">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Icon name="profile" size={32} className="text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Profile Incomplete</h3>
                  <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                    We need your health details to generate a comprehensive risk report and track your progress.
                  </p>
                  <button
                    onClick={() => setActiveTab("profile")}
                    className="btn-primary w-full"
                  >
                    Complete Profile
                  </button>
                </div>
              )}
            </DashboardCard>
          </div>
        )}

        {/* Daily Entry Tab */}
        {activeTab === "journal" && (
          <div className="space-y-6">
            <DashboardCard title={
              <span className="flex items-center gap-2">
                <Icon name="daily-entry" size={20} />
                Daily Entry
              </span>
            }>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    className="input w-full"
                    value={selectedDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setSelectedDate(newDate);
                      setNewEntryText("");
                      setEditingEntryId(null);
                      setQuestionsCompleted(false);
                      setDailyQuestions([]);
                      setCurrentQuestionIndex(0);
                      setQuestionAnswers([]);
                      setCurrentAnswer("");
                      // Load questions for the selected date
                      if (newDate) {
                        loadDailyEntryQuestions(newDate);
                      }
                    }}
                  />
                </div>

                {!selectedDate ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>Please select a date to start your daily entry</p>
                  </div>
                ) : questionsCompleted ? (
                  <div className="text-center py-8">
                    <div className="mb-4">
                      <Icon name="success" size={48} className="mx-auto mb-3 text-green-500" />
                      <p className="text-lg font-semibold text-green-700 mb-2">All Questions Answered! ✅</p>
                      <p className="text-sm text-slate-600">You have completed all questions for {selectedDate}</p>
                    </div>
                  </div>
                ) : loadingQuestions ? (
                  <div className="text-center py-8">
                    <Icon name="pending" size={48} className="mx-auto mb-3 text-slate-300 animate-spin" />
                    <p className="text-slate-500">Loading questions...</p>
                  </div>
                ) : dailyQuestions.length > 0 && currentQuestionIndex < dailyQuestions.length ? (
                  <div className="space-y-4">
                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">
                          Question {currentQuestionIndex + 1} of 6
                        </span>
                        <span className="text-xs text-slate-500">
                          {Math.round(((currentQuestionIndex + 1) / 6) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${((currentQuestionIndex + 1) / 6) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Current Question */}
                    <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border-2 border-pink-200 p-6">
                      <div className="mb-4">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold mb-3">
                          {currentQuestionIndex + 1}
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 leading-relaxed">
                          {dailyQuestions[currentQuestionIndex]}
                        </h3>
                      </div>

                      {/* Answer Input */}
                      <div className="mb-4">
                        <textarea
                          className="input w-full h-32"
                          placeholder="Type your answer here... (You can write in English, Bangla, or Banglish)"
                          value={currentAnswer}
                          onChange={(e) => setCurrentAnswer(e.target.value)}
                        />
                      </div>

                      {/* Navigation Buttons */}
                      <div className="flex items-center justify-between gap-3">
                        <button
                          onClick={() => {
                            if (currentQuestionIndex > 0) {
                              setCurrentQuestionIndex(currentQuestionIndex - 1);
                              setCurrentAnswer(questionAnswers[currentQuestionIndex - 1] || "");
                            }
                          }}
                          disabled={currentQuestionIndex === 0 || loading}
                          className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>←</span>
                          <span>Back</span>
                        </button>

                        <button
                          onClick={() => saveDailyEntryAnswer(currentQuestionIndex, currentAnswer)}
                          disabled={loading || !currentAnswer.trim()}
                          className="btn-primary flex items-center gap-2 disabled:opacity-50"
                        >
                          {loading ? "Saving..." : (
                            <>
                              <span>Save & Next</span>
                              <span>→</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 flex items-start gap-2">
                      <Icon name="info" size={16} className="mt-0.5" />
                      <span>AI generates personalized questions based on your pregnancy stage, health profile, and previous entries. Answer all 6 questions to complete your daily entry.</span>
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p>No questions available for this date. Please try again.</p>
                  </div>
                )}
              </div>
            </DashboardCard>

            <DashboardCard title={
              <span className="flex items-center gap-2">
                <Icon name="daily-entries" size={20} />
                Daily Entries
              </span>
            }>
              {dailyEntries.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No daily entries yet. Start writing your daily entries!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Group entries by date */}
                  {Object.entries(
                    dailyEntries.reduce((acc, entry) => {
                      if (!acc[entry.date]) {
                        acc[entry.date] = [];
                      }
                      acc[entry.date].push(entry);
                      return acc;
                    }, {} as Record<string, DailyEntry[]>)
                  )
                    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                    .map(([date, entries]) => (
                      <div key={date} className="border-b border-slate-200 pb-4 last:border-b-0">
                        <h3 className="font-semibold text-slate-800 mb-3">
                          {new Date(date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </h3>
                        <div className="space-y-3">
                          {entries
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map((entry) => (
                              <div
                                key={entry.id}
                                className="rounded-lg border border-slate-200 p-4 bg-slate-50"
                              >
                                {editingEntryId === entry.id ? (
                                  <div className="space-y-3">
                                    <textarea
                                      className="input w-full h-32"
                                      value={newEntryText}
                                      onChange={(e) => setNewEntryText(e.target.value)}
                                    />
                                    <div className="flex flex-col sm:flex-row gap-2">
                                      <button
                                        className="btn-primary text-sm touch-manipulation min-h-[44px] flex-1 sm:flex-initial"
                                        onClick={() => updateDailyEntry(entry.id, newEntryText)}
                                        disabled={loading || !newEntryText.trim()}
                                      >
                                        {loading ? "Saving..." : (
                                          <span className="flex items-center gap-1 justify-center">
                                            <Icon name="save" size={16} />
                                            Save
                                          </span>
                                        )}
                                      </button>
                                      <button
                                        className="btn-secondary text-sm touch-manipulation min-h-[44px] flex-1 sm:flex-initial"
                                        onClick={() => {
                                          setEditingEntryId(null);
                                          setNewEntryText("");
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex justify-between items-start mb-2">
                                      <span className="text-xs text-slate-500">
                                        {new Date(entry.createdAt).toLocaleTimeString()}
                                      </span>
                                      <div className="flex gap-2">
                                        <button
                                          className="text-xs text-blue-600 hover:text-blue-700"
                                          onClick={() => {
                                            setEditingEntryId(entry.id);
                                            setNewEntryText(entry.entry);
                                          }}
                                        >
                                          <span className="flex items-center gap-1">
                                            <Icon name="edit" size={14} />
                                            Edit
                                          </span>
                                        </button>
                                        <button
                                          className="text-xs text-red-600 hover:text-red-700"
                                          onClick={() => deleteDailyEntry(entry.id)}
                                          disabled={loading}
                                        >
                                          <span className="flex items-center gap-1">
                                            <Icon name="delete" size={14} />
                                            Delete
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                      {entry.entry}
                                    </p>
                                  </>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </DashboardCard>
          </div>
        )}


        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div id="notifications-section">
            <DashboardCard title={
              <span className="flex items-center gap-2">
                <Icon name="notifications" size={20} />
                Notifications
                {notificationsLoading && (
                  <Icon name="sync" size={16} className="animate-spin text-pink-600 ml-2" />
                )}
              </span>
            }>
            {notificationsLoading && notifications.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="sync" size={32} className="animate-spin text-pink-600 mx-auto mb-4" />
                <p className="text-slate-600">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No notifications yet. You'll receive recommendations and daily task reminders here!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-xl border-2 p-5 transition-all duration-300 hover:shadow-md ${
                      notification.read
                        ? "border-neutral-200 bg-gradient-to-br from-neutral-50 to-white"
                        : "border-pink-300 bg-gradient-to-br from-pink-50 via-rose-50 to-pink-50 shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-slate-800">{notification.title || (notification.type === "report_decision" ? "Report Decision" : "Notification")}</h4>
                      <div className="flex gap-2">
                        {!notification.read && (
                          <button
                            className="text-xs text-pink-600 hover:text-pink-700 px-2 py-1 rounded hover:bg-pink-50 transition-colors"
                            onClick={() => markNotificationAsRead(notification.id)}
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
                          onClick={() => deleteNotification(notification.id)}
                          disabled={loading}
                        >
                          <Icon name="delete" size={14} />
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {notification.content || notification.message || ""}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>
          </div>
        )}
        </div>
        </div>
      </Layout>
  );
}
