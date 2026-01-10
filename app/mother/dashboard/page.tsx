"use client";

import DashboardCard from "@/components/DashboardCard";
import Layout from "@/components/Layout";
import CommentSection from "@/components/CommentSection";
import MessagePopup from "@/components/MessagePopup";
import DailyQuestionPopup from "@/components/DailyQuestionPopup";
import FoodRecommendations from "@/components/FoodRecommendations";
import GenerateReportModal from "@/components/GenerateReportModal";
import Icon from "@/components/Icon";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { getLanguage } from "@/lib/i18n";
import { safeAsync } from "@/lib/safeAsync";

type Profile = {
  name?: string;
  email: string;
  age?: number;
  phone?: string;
  address?: string;
  area?: string;
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

const AREA_LINKS: Record<string, string> = {
  Dhaka: "https://www.doctorbangladesh.com/gynecologist-dhaka/",
  Chittagong: "https://www.doctorbangladesh.com/gynecologist-chittagong/",
  Sylhet: "https://www.doctorbangladesh.com/gynecologist-sylhet/",
  Rajshahi: "https://www.doctorbangladesh.com/gynecologist-rajshahi/",
  Rangpur: "https://www.doctorbangladesh.com/gynecologist-rangpur/",
  Khulna: "https://www.doctorbangladesh.com/gynecologist-khulna/",
  Barishal: "https://www.doctorbangladesh.com/gynecologist-barisal/",
  Mymensingh: "https://www.doctorbangladesh.com/gynecologist-mymensingh/",
  Pabna: "https://www.doctorbangladesh.com/gynecologist-pabna/",
  Cumilla: "https://www.doctorbangladesh.com/gynecologist-cumilla/",
  Bogura: "https://www.doctorbangladesh.com/gynecologist-bogura/",
  Narayaganj: "https://www.doctorbangladesh.com/gynecologist-Narayanganj/",
  Kushtia: "https://www.doctorbangladesh.com/gynecologist-kushtia/",
};

const SCRAPINGDOG_API_KEY = process.env.NEXT_PUBLIC_SCRAPINGDOG_API_KEY || "";

export default function MotherDashboard() {
  const t = useTranslation();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [motherId, setMotherId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "prescriptions" | "questions" | "progress" | "journal" | "notifications" | "find-doctor" | "food" | null>(null);
  const [showCards, setShowCards] = useState(true);
  const [deletingPrescription, setDeletingPrescription] = useState<string | null>(null);
  const [renamingPrescription, setRenamingPrescription] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [newEntryText, setNewEntryText] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [doctorArea, setDoctorArea] = useState<string>("");
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorError, setDoctorError] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  type Doctor = {
    name: string;
    qualifications?: string;
    specialty?: string;
    designation?: string;
    hospital?: string;
    image?: string;
    detailsUrl?: string;
  };
  const [doctorList, setDoctorList] = useState<Doctor[]>([]);
  const [selectedDoctorDetails, setSelectedDoctorDetails] = useState<{
    doctor: Doctor;
    details?: string;
    chambers?: string;
    appointments?: string;
    about?: string;
  } | null>(null);
  const [doctorDetailsLoading, setDoctorDetailsLoading] = useState(false);
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
      const scrollToNotifications = () => {
        const notificationsElement = document.getElementById("notifications-section");
        if (notificationsElement) {
          notificationsElement.scrollIntoView({ behavior: "smooth", block: "start" });
          setShouldScrollToNotifications(false);
        } else {
          // Retry if element not found yet
          setTimeout(scrollToNotifications, 100);
        }
      };
      // Wait for tab to render
      setTimeout(scrollToNotifications, 150);
    }
  }, [activeTab, shouldScrollToNotifications]);

  useEffect(() => {
    const t = localStorage.getItem("motherToken") || "";
    setToken(t);
    if (!t) return;
    try {
      const payload = JSON.parse(atob(t.split('.')[1]));
      setMotherId(payload.id || "");
    } catch {
      // Will be set when profile loads
    }

    const validTabs = ["profile", "prescriptions", "questions", "progress", "journal", "notifications", "find-doctor", "food"];

    const updateFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const paramTab = params.get("tab");
      if (paramTab && validTabs.includes(paramTab)) {
        setActiveTab(paramTab as any);
        setShowCards(false);
      } else {
        setActiveTab(null);
        setShowCards(true);
      }
    };

    updateFromUrl();
    window.addEventListener("popstate", updateFromUrl);
    
    fetchProfile(t);
    fetchPrescriptions(t);
    fetchQuestions(t);
    fetchDailyEntries(t);
    fetchNotifications(t);
    updatePregnancyProgress(t);
    checkDailyTask(t);
    
    // Removed checkDailyQuestions - Daily Health Questions section removed
    
    const frequentInterval = setInterval(() => {
      fetchNotifications(t);
      fetchQuestions(t);
    }, 30 * 1000);
    
    const mediumInterval = setInterval(() => {
      fetchPrescriptions(t);
      fetchDailyEntries(t);
    }, 2 * 60 * 1000);
    
    const slowInterval = setInterval(() => {
      updatePregnancyProgress(t);
      checkDailyTask(t);
      fetchProfile(t);
    }, 5 * 60 * 1000);
    
    return () => {
      window.removeEventListener("popstate", updateFromUrl);
      clearInterval(frequentInterval);
      clearInterval(mediumInterval);
      clearInterval(slowInterval);
    };
  }, []);
  
  useEffect(() => {
    if (!doctorArea && profile?.area) {
      setDoctorArea(profile.area);
    }
  }, [profile, doctorArea]);

  // Auto fetch doctors when entering the tab with a known area
  useEffect(() => {
    if (activeTab === "find-doctor" && doctorArea && doctorList.length === 0 && !doctorLoading) {
      fetchDoctorList(doctorArea);
    }
  }, [activeTab, doctorArea, doctorList.length, doctorLoading]);

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
        // Filter out page images (keep only main files - PDFs and direct image uploads)
        // Page images are for AI analysis but shouldn't be shown in the list
        const mainFiles = (data.items || []).filter((item: any) => {
          const key = item.key || "";
          // Exclude page images (files ending with _page1.jpg, _page2.jpg, etc.)
          return !key.match(/_page\d+\.(jpg|jpeg|png)$/i);
        });
        console.log("Filtered prescriptions (excluding page images):", mainFiles.length, "items");
        setPrescriptions(mainFiles);
      } else {
        console.error("Failed to fetch prescriptions:", res.status, res.statusText);
        const errorData = await res.json().catch(() => ({}));
        console.error("Error details:", errorData);
      }
    } catch (err) {
      console.error("Error fetching prescriptions:", err);
    }
  };

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

  const parseDoctorMarkdown = (markdown: string): Doctor[] => {
    if (!markdown || markdown.trim().length === 0) {
      return [];
    }

    const entries: Doctor[] = [];
    const lines = markdown.split('\n').map(l => l.trim()).filter(Boolean);
    let currentDoctor: Partial<Doctor> = {};
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
          entries.push(currentDoctor as Doctor);
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
      entries.push(currentDoctor as Doctor);
    }

    return entries;
  };

  const fetchDoctorDetails = async (doctor: Doctor) => {
    if (!doctor.detailsUrl) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "Doctor details URL not available.",
      });
      return;
    }

    setDoctorDetailsLoading(true);
    setSelectedDoctorDetails({ doctor });

    try {
      const params = new URLSearchParams({
        api_key: SCRAPINGDOG_API_KEY,
        url: doctor.detailsUrl,
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

      setSelectedDoctorDetails({
        doctor,
        details: details || undefined,
        chambers: chambers || undefined,
        appointments: appointments || undefined,
        about: about || undefined,
      });
    } catch (err: any) {
      console.error("Error fetching doctor details:", err);
      setPopup({
        isOpen: true,
        type: "error",
        title: "Error",
        message: err?.message || "Could not load doctor details. Please try again.",
      });
      setSelectedDoctorDetails(null);
    } finally {
      setDoctorDetailsLoading(false);
    }
  };

  const fetchDoctorList = async (area: string) => {
    if (!area) {
      setDoctorError("Please select an area");
      return;
    }
    if (!SCRAPINGDOG_API_KEY) {
      setDoctorError("API key is not configured. Please contact support.");
      return;
    }
    const url = AREA_LINKS[area];
    if (!url) {
      setDoctorError("No doctor list available for this area yet.");
      return;
    }
    setDoctorLoading(true);
    setDoctorError("");
    setDoctorList([]);
    try {
      const params = new URLSearchParams({
        api_key: SCRAPINGDOG_API_KEY,
        url: url,
        dynamic: 'false',
        markdown: 'true'
      });

      const res = await fetch(`https://api.scrapingdog.com/scrape?${params.toString()}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch doctors (${res.status})`);
      }
      
      const markdown = await res.text();
      
      if (!markdown || markdown.trim().length === 0) {
        throw new Error("No data received from the server. Please try again.");
      }
      
      const parsed = parseDoctorMarkdown(markdown);
      
      if (parsed.length === 0) {
        throw new Error("Could not parse doctor information. Please try again later.");
      }
      
      setDoctorList(parsed);
    } catch (err: any) {
      console.error("Error fetching doctors:", err);
      setDoctorError(err?.message || "Could not load doctor list. Please try again.");
      setDoctorList([]);
    } finally {
      setDoctorLoading(false);
    }
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

  const fetchQuestions = async (t = token) => {
    const res = await fetch("/api/mother/questions", { headers: authHeaders(t) });
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.questions || []);
      // If a question is selected, update it with latest data but don't reopen if it was closed
      setSelectedQuestion((current) => {
        if (current) {
          const updated = data.questions?.find((q: Question) => q.id === current.id);
          if (updated) {
            return { ...updated, comments: current.comments || updated.comments || [] };
          }
        }
        return current;
      });
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

  const navigateToTab = (tab: "prescriptions" | "questions" | "progress" | "journal" | "notifications" | "profile" | "find-doctor" | "food") => {
    setActiveTab(tab);
    setShowCards(false);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.push(`/mother/dashboard?${params.toString()}`);
  };

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
      action: () => navigateToTab("profile"),
      accent: "from-indigo-500 to-blue-500",
    },
    {
      id: "prescriptions",
      title: "Prescription",
      description: "Upload or review prescriptions for better guidance.",
      icon: "prescription",
      action: () => navigateToTab("prescriptions"),
      accent: "from-cyan-500 to-teal-500",
    },
    {
      id: "questions",
      title: "Q&A",
      description: "Ask doctors, read answers, and comments.",
      icon: "question",
      action: () => navigateToTab("questions"),
      accent: "from-purple-500 to-violet-500",
    },
    {
      id: "journal",
      title: "Daily Entry",
      description: "Log daily notes, symptoms, and mood changes.",
      icon: "daily-entry",
      action: () => navigateToTab("journal"),
      accent: "from-amber-500 to-orange-500",
    },
    {
      id: "food",
      title: "Daily Routine",
      description: "Get personalized daily food and exercise suggestions based on your health profile.",
      icon: "health",
      action: () => navigateToTab("food"),
      accent: "from-orange-500 to-pink-500",
    },
    {
      id: "progress",
      title: "Progress",
      description: "Track your pregnancy journey and milestones.",
      icon: "progress",
      action: () => navigateToTab("progress"),
      accent: "from-emerald-500 to-green-500",
    },
    {
      id: "find-doctor",
      title: "Find a Doctor",
      description: "See gynecologists near you by area.",
      icon: "doctor",
      action: () => navigateToTab("find-doctor"),
      accent: "from-rose-500 to-orange-500",
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
          <section className="relative overflow-hidden bg-gradient-to-br from-pink-100 via-rose-50 to-pink-100 rounded-3xl p-6 sm:p-8 md:p-12 mt-6 border border-pink-200 shadow-lg">
            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-200 rounded-full blur-3xl opacity-20"></div>
            <button
              onClick={() => {
                setActiveTab("notifications");
                setShowCards(false);
                setShouldScrollToNotifications(true);
              }}
              aria-label="View notifications"
              className="absolute top-4 right-4 md:top-6 md:right-6 w-11 h-11 rounded-full bg-white/90 backdrop-blur border border-pink-200 shadow-md flex items-center justify-center hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              <Icon name="notifications" size={22} className="text-pink-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white" />
              )}
            </button>
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-neutral-900 mb-2 md:mb-3">
                    Welcome{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}! 👋
                  </h1>
                  <p className="text-base sm:text-lg md:text-xl text-neutral-700 font-medium mb-4 md:mb-6">
                    Get 24/7 AI-powered pregnancy support tailored to your journey.
                  </p>
                  {weeksPregnant && (
                    <div className="flex flex-wrap gap-4">
                      <div className="bg-white/80 backdrop-blur-sm rounded-xl px-6 py-4 shadow-md border border-pink-200">
                        <p className="text-sm text-neutral-600 mb-1">Week of Pregnancy</p>
                        <p className="text-2xl font-bold text-pink-600">{weeksPregnant} weeks</p>
                      </div>
                      {daysLeft !== null && (
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl px-6 py-4 shadow-md border border-pink-200">
                          <p className="text-sm text-neutral-600 mb-1">Days to Due Date</p>
                          <p className="text-2xl font-bold text-pink-600">{daysLeft} days</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="hidden md:flex flex-shrink-0">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center shadow-xl">
                    <Icon name="mom" size={64} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <MessagePopup
            isOpen={popup.isOpen}
            onClose={() => setPopup({ ...popup, isOpen: false })}
            type={popup.type}
            title={popup.title}
            message={popup.message}
          />

          {/* Doctor Details Popup */}
          {selectedDoctorDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-pink-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Doctor Details</h2>
                  <button
                    onClick={() => setSelectedDoctorDetails(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-2 -mr-2 touch-manipulation"
                    aria-label="Close"
                  >
                    <Icon name="close" size={24} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {doctorDetailsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Icon name="sync" size={32} className="animate-spin text-pink-600" />
                        <p className="text-gray-600 text-sm sm:text-base">Loading doctor details...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Doctor Info */}
                      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 pb-4 border-b border-gray-200">
                        {selectedDoctorDetails.doctor.image ? (
                          <img
                            src={selectedDoctorDetails.doctor.image}
                            alt={selectedDoctorDetails.doctor.name}
                            className="w-24 h-24 rounded-xl object-cover border-2 border-pink-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {selectedDoctorDetails.doctor.name}
                          </h3>
                          {selectedDoctorDetails.doctor.qualifications && (
                            <p className="text-sm text-gray-600 mb-1">
                              {selectedDoctorDetails.doctor.qualifications}
                            </p>
                          )}
                          {selectedDoctorDetails.doctor.specialty && (
                            <p className="text-sm text-pink-600 font-medium mb-1">
                              {selectedDoctorDetails.doctor.specialty}
                            </p>
                          )}
                          {selectedDoctorDetails.doctor.designation && (
                            <p className="text-xs text-gray-500 mb-1">
                              {selectedDoctorDetails.doctor.designation}
                            </p>
                          )}
                          {selectedDoctorDetails.doctor.hospital && (
                            <p className="text-xs text-gray-600">
                              {selectedDoctorDetails.doctor.hospital}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Chambers */}
                      {selectedDoctorDetails.chambers && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Image
                              src="/icons/clinic.png"
                              alt="Clinic"
                              width={18}
                              height={18}
                              className="object-contain"
                            />
                            Chambers
                          </h4>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {selectedDoctorDetails.chambers}
                          </p>
                        </div>
                      )}

                      {/* Appointments */}
                      {selectedDoctorDetails.appointments && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Icon name="clock" size={18} className="text-pink-600" />
                            Appointment Details
                          </h4>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {selectedDoctorDetails.appointments}
                          </p>
                        </div>
                      )}

                      {/* Additional Details */}
                      {selectedDoctorDetails.details && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Icon name="info" size={18} className="text-pink-600" />
                            Additional Information
                          </h4>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {selectedDoctorDetails.details}
                          </p>
                        </div>
                      )}

                      {!selectedDoctorDetails.chambers && 
                       !selectedDoctorDetails.appointments && !selectedDoctorDetails.details && (
                        <div className="text-center py-8 text-gray-500">
                          <p>No additional details available for this doctor.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setSelectedDoctorDetails(null)}
                    className="w-full btn-primary touch-manipulation min-h-[44px]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

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
            <section>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                {navigationCards.map((card) => {
                  const CardContent = (
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${card.accent || "from-pink-500 to-rose-500"} flex items-center justify-center shadow-lg flex-shrink-0`}>
                        <Icon name={card.icon} size={20} className="sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-neutral-900">{card.title}</h3>
                        </div>
                        <p className="text-neutral-600 text-xs sm:text-sm mb-2 leading-relaxed">
                          {card.description}
                        </p>
                        <div className="flex items-center gap-2 text-pink-600 font-semibold text-xs sm:text-sm group-hover:gap-3 transition-all">
                          <span>{card.href ? "Open" : "Go to section"}</span>
                          <span>→</span>
                        </div>
                      </div>
                    </div>
                  );

                  if (card.href) {
                    return (
                      <Link
                        key={card.id}
                        href={card.href}
                        className="group relative rounded-xl bg-white border-2 border-neutral-200 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 hover:border-pink-300 active:scale-[0.98]"
                        onClick={() => setShowCards(false)}
                      >
                        {CardContent}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={card.id}
                      onClick={() => card.action && card.action()}
                      className="group text-left rounded-xl bg-white border-2 border-neutral-200 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 hover:border-pink-300 active:scale-[0.98] touch-manipulation"
                    >
                      {CardContent}
                    </button>
                  );
                })}
              </div>
            </section>
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
                    Area you live
                  </label>
                  <select
                    className="input w-full"
                    value={profile.area || ""}
                    onChange={(e) => setProfile({ ...profile, area: e.target.value || undefined })}
                  >
                    <option value="">Select area</option>
                    {AREA_OPTIONS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
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
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                      {prescriptions.map((p) => {
                        const fileName = p.key.split("/").pop() || "prescription";
                        const isPdf = p.isPdf || p.key.endsWith('.pdf');
                        const hasImages = p.imageUrls && p.imageUrls.length > 0;
                        return (
                          <div
                            key={p.key}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border-2 border-neutral-200 bg-white p-4 sm:p-5 hover:shadow-md hover:border-pink-300 transition-all gap-3 sm:gap-0"
                          >
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full sm:w-auto">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                                <Icon name="prescription" size={24} className="sm:w-7 sm:h-7 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm sm:text-base text-slate-800 truncate">{fileName}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {isPdf && hasImages 
                                    ? `${p.pageCount || p.imageUrls?.length || 0} page(s) converted to images • Click to view`
                                    : "Click to view"}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 items-center flex-shrink-0 w-full sm:w-auto">
                              <a
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary text-sm px-3 sm:px-4 py-2.5 h-[44px] sm:h-[40px] flex items-center justify-center gap-1.5 flex-1 sm:flex-initial touch-manipulation"
                              >
                                <Icon name="view" size={16} />
                                <span className="sm:inline">{isPdf ? "View PDF" : "View"}</span>
                              </a>
                              {hasImages && (
                                <button
                                  onClick={safeAsync(async () => {
                                    // Show images in a modal
                                    if (p.imageUrls && p.imageUrls.length > 0) {
                                      const imageUrls = p.imageUrls || [];
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
                                              <title>${fileName} - Converted Images</title>
                                              <style>
                                                body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                                                h1 { color: #333; margin-bottom: 10px; }
                                                p { color: #666; margin-bottom: 20px; }
                                              </style>
                                            </head>
                                            <body>
                                              <h1>${fileName}</h1>
                                              <p><strong>${imageUrls.length} page(s)</strong> converted to images</p>
                                              ${imagesHtml}
                                            </body>
                                          </html>
                                        `);
                                        newWindow.document.close();
                                      }
                                    }
                                  })}
                                  className="btn-primary text-sm px-3 sm:px-4 py-2.5 h-[44px] sm:h-[40px] flex items-center justify-center gap-1.5 flex-1 sm:flex-initial touch-manipulation"
                                >
                                  <Icon name="view" size={16} />
                                  <span className="sm:inline">Images ({p.imageUrls?.length || 0})</span>
                                </button>
                              )}
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
                                className="btn-secondary text-sm bg-red-50 text-red-600 border-red-200 hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 h-[44px] sm:h-[40px] min-w-[44px] sm:min-w-[40px] touch-manipulation"
                              >
                                {deletingPrescription === p.key ? (
                                  "..."
                                ) : (
                                  <Icon name="delete" size={18} className="flex-shrink-0" />
                                )}
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
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    disabled={loading}
                  />
                  <button className="btn-primary w-full flex items-center gap-2 justify-center py-3 sm:py-4 text-base sm:text-lg font-semibold touch-manipulation min-h-[44px]" onClick={submitQuestion} disabled={loading || !questionText.trim()}>
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
                {questions.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50">
                    <Icon name="question" size={48} className="mx-auto mb-3 text-neutral-300" />
                    <p className="text-lg font-medium mb-2">{t.mother.noQuestions}</p>
                    <p className="text-sm">{t.mother.askDoctor}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Answered Questions - Grid View */}
                    {questions.filter(q => q.answer).length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
                          <Icon name="success" size={24} />
                          Answered Questions ({questions.filter(q => q.answer).length})
                        </h3>
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                        {questions.filter(q => q.answer).map((q) => {
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
                    {questions.filter(q => !q.answer).length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-xl font-bold text-yellow-700 mb-4 flex items-center gap-2">
                          <Icon name="pending" size={24} />
                          Pending Questions ({questions.filter(q => !q.answer).length})
                        </h3>
                      <div className="space-y-3">
                        {questions.filter(q => !q.answer).map((q) => (
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
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
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
                      <p className="text-sm font-medium text-pink-700 mb-1 flex items-center gap-1">
                        <Icon name="pregnancy-progress" size={16} />
                        Pregnancy Progress
                      </p>
                      <p className="text-lg font-semibold text-pink-900">
                        {Math.floor((profile.daysPregnant || 0) / 7)} weeks, {Math.floor((profile.daysPregnant || 0) / 30)} months
                      </p>
                      <p className="text-sm text-pink-700 mt-1">
                        {profile.daysPregnant} days pregnant
                      </p>
                    </div>
                  )}
                  {profile && (() => {
                    const { assessRisk } = require("@/lib/riskPrediction");
                    const riskAssessment = assessRisk(profile);
                    const riskColors: Record<"low" | "medium" | "high", string> = {
                      low: "bg-green-100 text-green-700 border-green-200",
                      medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
                      high: "bg-red-100 text-red-700 border-red-200",
                    };
                    const riskLevel = riskAssessment.overallRisk as "low" | "medium" | "high";
                    return (
                      <div className={`rounded-lg border-2 p-4 ${riskColors[riskLevel]}`}>
                        <p className="text-sm font-medium mb-1 flex items-center gap-1">
                          <Icon name="warning" size={16} />
                          Risk Level
                        </p>
                        <p className="text-lg font-semibold capitalize">
                          {riskAssessment.overallRisk} Risk
                        </p>
                        <p className="text-xs mt-1 opacity-90">
                          Risk Score: {riskAssessment.riskScore}/100
                        </p>
                        {riskAssessment.riskFactors.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                            <p className="text-xs font-medium mb-1">Key Factors:</p>
                            <ul className="text-xs space-y-1">
                              {riskAssessment.riskFactors.slice(0, 3).map((factor: any, idx: number) => (
                                <li key={idx}>• {factor.factor}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>Complete your profile to see progress</p>
                  <button
                    onClick={() => setActiveTab("profile")}
                    className="btn-secondary mt-3 touch-manipulation min-h-[44px] w-full sm:w-auto"
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
                      setSelectedDate(e.target.value);
                      setNewEntryText("");
                      setEditingEntryId(null);
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
                    value={newEntryText}
                    onChange={(e) => setNewEntryText(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1 flex items-start gap-2">
                    <Icon name="info" size={16} className="mt-0.5" />
                    <span>Tip: You can add multiple entries for the same day. Write freely about your day, meals, feelings, and any concerns. This helps AI provide better recommendations.</span>
                  </p>
                </div>
                <button
                  className="btn-primary w-full touch-manipulation min-h-[44px]"
                  onClick={saveDailyEntry}
                  disabled={loading || !newEntryText.trim()}
                >
                  {loading ? "Saving..." : (
                    <span className="flex items-center gap-2 justify-center">
                      <Icon name="save" size={18} />
                      Add Daily Entry
                    </span>
                  )}
                </button>
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

        {/* Find a Doctor Tab */}
        {activeTab === "find-doctor" && (
          <DashboardCard title={
            <span className="flex items-center gap-2">
              <Icon name="doctor" size={20} />
              Find a Doctor
            </span>
          }>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Choose your area
                  </label>
                  <select
                    className="input w-full text-base touch-manipulation min-h-[44px]"
                    value={doctorArea}
                    onChange={(e) => setDoctorArea(e.target.value)}
                  >
                    <option value="">Select area</option>
                    {AREA_OPTIONS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    We'll fetch gynecologists from the selected city list.
                  </p>
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-slate-700 mb-2 opacity-0">
                    Action
                  </label>
                  <button
                    className="btn-primary w-full sm:w-auto whitespace-nowrap min-h-[42px] flex items-center justify-center"
                    onClick={() => fetchDoctorList(doctorArea)}
                    disabled={!doctorArea || doctorLoading}
                  >
                    {doctorLoading ? (
                      <span className="flex items-center gap-2">
                        <Icon name="sync" size={18} className="animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Icon name="doctor" size={18} />
                        Find Doctors
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {doctorError && (
                <div className="rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {doctorError}
                </div>
              )}

              {doctorLoading && (
                <div className="flex items-center gap-2 text-slate-600 text-sm">
                  <Icon name="sync" size={18} className="animate-spin" />
                  Fetching doctor list...
                </div>
              )}

              {!doctorLoading && !doctorError && doctorList.length === 0 && (
                <div className="text-sm text-slate-500">
                  Select an area and tap "Find Doctors" to see the list.
                </div>
              )}

              {!doctorLoading && doctorList.length > 0 && (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {doctorList.map((doc, idx) => (
                    <div
                      key={`${doc.name}-${idx}`}
                      className="group bg-white rounded-2xl shadow-sm border border-gray-200/60 hover:shadow-xl hover:border-pink-200 transition-all duration-300 flex flex-col h-full overflow-hidden"
                    >
                      {/* Header Section with Image */}
                      <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-pink-50 px-5 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          {doc.image ? (
                            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 border-white shadow-md relative bg-gradient-to-br from-pink-500 to-rose-500">
                              <img 
                                src={doc.image} 
                                alt={doc.name}
                                className="w-full h-full object-cover relative z-10"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center z-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="8" r="5"/>
                                  <path d="M20 21a8 8 0 0 0-16 0"/>
                                </svg>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gradient-to-br from-pink-500 to-rose-500 p-2.5 rounded-xl shadow-sm flex-shrink-0 w-14 h-14 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                <circle cx="12" cy="8" r="5"/>
                                <path d="M20 21a8 8 0 0 0-16 0"/>
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 leading-snug truncate group-hover:text-pink-700 transition-colors">
                              {doc.name}
                            </h3>
                          </div>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-5 flex-1 flex flex-col gap-3.5">
                        {doc.qualifications && (
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center rounded-md bg-blue-50">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                                <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>
                                <path d="M22 10v6"/>
                                <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-600 leading-relaxed break-words">{doc.qualifications}</p>
                            </div>
                          </div>
                        )}
                        
                        {doc.specialty && (
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center rounded-md bg-pink-50">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-600">
                                <path d="M11 2v2"/>
                                <path d="M5 2v2"/>
                                <path d="M5 5c0 4 2.5 6 5.5 6 2.65 0 4-2 4.5-5"/>
                                <path d="M8 15a6 6 0 1 0 12 0v-3"/>
                                <circle cx="20" cy="10" r="2"/>
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-700 leading-relaxed break-words font-medium">{doc.specialty}</p>
                            </div>
                          </div>
                        )}

                        {doc.designation && (
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center rounded-md bg-purple-50">
                              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-600 leading-relaxed break-words">{doc.designation}</p>
                            </div>
                          </div>
                        )}

                        {doc.hospital && (
                          <div className="flex items-start gap-3 pt-1 border-t border-gray-100">
                            <div className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center rounded-md bg-emerald-50">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
                                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
                                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
                                <path d="M10 6h4"/>
                                <path d="M10 10h4"/>
                                <path d="M10 14h4"/>
                                <path d="M10 18h4"/>
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-600 leading-relaxed break-words">{doc.hospital}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer with See Details Button */}
                      {doc.detailsUrl && (
                        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                          <button
                            onClick={() => fetchDoctorDetails(doc)}
                            className="w-full btn-secondary text-center flex items-center justify-center gap-2 text-sm py-2.5"
                          >
                            <Icon name="view" size={16} />
                            See Details
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DashboardCard>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div id="notifications-section">
            <DashboardCard title={
              <span className="flex items-center gap-2">
                <Icon name="notifications" size={20} />
                Notifications
              </span>
            }>
            {notifications.length === 0 ? (
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
      </Layout>
  );
}
