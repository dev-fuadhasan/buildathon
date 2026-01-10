import { getJson, listObjects, putJson } from "./r2Client";

export type MotherProfile = {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  age?: number;
  phone?: string;
  address?: string;
  bloodGroup?: string;
  weeksPregnant?: number; // Kept for backward compatibility
  daysPregnant?: number; // New: Days since LMP (Last Menstrual Period)
  dueDate?: string;
  lastPregnancyDayUpdate?: string; // ISO date of last auto-increment
  timezone?: string; // User's timezone (e.g., "Asia/Dhaka", "America/New_York")
  conditions?: string;
  medications?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  previousPregnancies?: number;
  allergies?: string;
  status?: "active" | "paused"; // Account status
  lastJournalEntryDate?: string; // YYYY-MM-DD
  lastMorningAdviceDate?: string; // YYYY-MM-DD
  lastNightAdviceDate?: string; // YYYY-MM-DD
  lastQuestionDate?: string; // YYYY-MM-DD - Last date questions were shown
  answeredQuestionIds?: string[]; // IDs of questions already answered (to avoid repeats)
  createdAt: string;
  updatedAt: string;
};

export type ProfileChange = {
  field: string;
  oldValue: string | undefined;
  newValue: string | undefined;
};

export type HealthWorkerRole = "doctor" | "nurse" | "others";
export type HealthWorkerStatus = "pending" | "approved" | "rejected" | "paused";

export type DoctorProfile = {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  phone?: string;
  role: HealthWorkerRole; // "doctor" | "nurse" | "others"
  specialty?: string;
  bmdcNumber?: string; // BMDC Registration Number
  hospitalClinicName?: string; // Hospital/Clinic name (normalized for matching)
  hospitalClinicNameOriginal?: string; // Original name as entered by user
  clinicName?: string; // Keep for backward compatibility (same as hospitalClinicName)
  clinicAddress?: string;
  profilePicture?: string; // URL to profile picture in R2
  qualification?: string; // Medical qualifications
  experience?: string; // Years of experience
  status: HealthWorkerStatus;
  verificationComment?: string; // Admin's comment on verification
  pendingVerification?: boolean; // True when profile is edited and needs re-verification
  previousValues?: Partial<DoctorProfile>; // Store previous values before changes
  changes?: ProfileChange[]; // Track what fields were changed
  createdAt: string;
  updatedAt: string;
};

export type EditorProfile = {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  status: "active" | "paused" | "deleted"; // Editor account status
  createdAt: string;
  updatedAt: string;
  createdBy: string; // Super admin ID who created this editor
};

// Patient data for nurses/others
export type PatientData = {
  id: string;
  hospitalClinicName: string; // Which hospital/clinic this patient belongs to
  name: string;
  age?: number;
  phone: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  medicalHistory?: string;
  allergies?: string;
  currentMedications?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
  prescriptions: PatientFile[]; // Prescription files
  reports: PatientFile[]; // Lab reports, test results
  documents: PatientFile[]; // Other medical documents
  createdBy: string; // Health worker ID who created this patient
  createdByName?: string; // Name of health worker who created
  createdAt: string;
  updatedBy?: string; // Health worker ID who last updated
  updatedByName?: string; // Name of health worker who last updated
  updatedAt: string;
  lastPriorityCheck?: string; // When AI last checked priority
  priorityScore?: number; // AI-generated priority score (higher = more urgent)
  priorityReason?: string; // AI-generated reason for priority
};

export type PatientFile = {
  id: string;
  key: string; // R2 storage key
  url: string; // Signed URL
  fileName: string;
  fileType: string; // "prescription" | "report" | "document"
  uploadedBy: string; // Health worker ID
  uploadedByName?: string; // Name of health worker
  uploadedAt: string;
  description?: string;
};

export type Comment = {
  id: string;
  questionId?: string;
  authorId: string;
  authorRole: "doctor" | "mother";
  content: string;
  createdAt: string;
  replies?: Comment[];
};

export type Question = {
  id: string;
  motherId: string;
  question: string;
  answer?: string;
  doctorId?: string;
  createdAt: string;
  answeredAt?: string;
  comments?: Comment[];
  lastSeenByMother?: string; // ISO timestamp of when mother last viewed this question
  lastSeenByDoctor?: string; // ISO timestamp of when doctor last viewed this question
  hasNewActivity?: boolean; // Flag to indicate new comments/answers since last view
  reported?: boolean; // Flag to indicate if this question/answer was reported
  reportReason?: string; // Reason for reporting
  reportedBy?: string; // ID of the user who reported
  reportedAt?: string; // When it was reported
  reportStatus?: "pending" | "solved" | "rejected"; // Report status
  adminDecision?: string; // Admin's decision/response to the report
  adminDecisionAt?: string; // When admin made the decision
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export type ChatHistory = {
  motherId: string;
  messages: ChatMessage[];
  updatedAt: string;
};

// New: Multiple conversation support
export type Conversation = {
  id: string; // UUID
  motherId: string;
  title: string; // Auto-generated from first user message
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

// Live Chat Types
export type LiveChatUser = {
  userId?: string; // If logged in (mother/doctor ID)
  userType?: "mother" | "doctor"; // If logged in
  name: string;
  phone: string;
  email?: string;
  sessionId?: string; // Browser session identifier
  ipAddress?: string; // IP address for persistence
};

export type LiveChatMessage = {
  id: string;
  conversationId: string;
  senderId: string; // "admin" or user identifier
  senderType: "admin" | "user";
  senderName: string;
  content: string;
  createdAt: string;
  read: boolean;
};

export type LiveChatConversation = {
  id: string; // Unique conversation ID
  userId?: string; // If logged in
  userType?: "mother" | "doctor";
  userName: string;
  userPhone: string;
  userEmail?: string;
  sessionId?: string; // Browser session
  ipAddress?: string;
  messages: LiveChatMessage[];
  status: "active" | "closed" | "resolved";
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  adminId?: string; // Admin handling the conversation
};

export type DailyEntry = {
  id: string;
  motherId: string;
  date: string; // YYYY-MM-DD format
  entry: string; // Mother's daily entry (English, Bangla, or Banglish)
  createdAt: string;
  updatedAt: string;
};

export type DailyQuestion = {
  id: string;
  motherId: string;
  questionId: string; // ID from question dataset
  date: string; // YYYY-MM-DD format
  answer: "yes" | "no";
  createdAt: string;
};

export type DailyQuestionSession = {
  id: string;
  motherId: string;
  date: string; // YYYY-MM-DD format
  questionIds: string[]; // IDs of questions shown today
  answeredCount: number; // How many answered so far
  totalQuestions: number; // Total questions for today (usually 10)
  completed: boolean; // Whether all questions are answered
  earlyProblems?: string[]; // Detected early problems/alerts based on answers (AI-generated)
  earlyProblemRecommendation?: string; // AI-generated recommendation (1-2 sentences)
  createdAt: string;
  updatedAt: string;
};

export type DailyRoutine = {
  id: string;
  motherId: string;
  date: string; // YYYY-MM-DD format
  breakfast: string; // Food recommendation for breakfast
  lunch: string; // Food recommendation for lunch
  dinner: string; // Food recommendation for dinner
  exercises: string; // Exercise recommendations
  breakfastEaten?: boolean; // Whether breakfast was eaten
  lunchEaten?: boolean; // Whether lunch was eaten
  dinnerEaten?: boolean; // Whether dinner was eaten
  exercisesDone?: boolean; // Whether exercises were done
  breakfastEatenAt?: string; // ISO timestamp when marked as eaten
  lunchEatenAt?: string; // ISO timestamp when marked as eaten
  dinnerEatenAt?: string; // ISO timestamp when marked as eaten
  exercisesDoneAt?: string; // ISO timestamp when marked as done
  dailyReport?: DailyRoutineReport; // Daily report generated after 11:30 PM
  createdAt: string;
  updatedAt: string;
};

export type DailyRoutineReport = {
  id: string;
  date: string; // YYYY-MM-DD format
  foodAnalysis: {
    eaten: string[]; // Meals that were eaten
    notEaten: string[]; // Meals that were not eaten
    benefits: string[]; // Benefits from eaten meals
    negativeImpacts: string[]; // Negative impacts from not eaten meals
    status: "good" | "moderate" | "poor"; // Overall food status
  };
  exerciseAnalysis: {
    done: boolean; // Whether exercises were done
    benefits?: string[]; // Benefits from doing exercises
    negativeImpacts?: string[]; // Negative impacts from not doing exercises
    status: "good" | "moderate" | "poor"; // Overall exercise status
  };
  overallStatus: "good" | "moderate" | "poor"; // Overall daily routine status
  createdAt: string;
};

// Keep FoodRecommendation for backward compatibility
export type FoodRecommendation = DailyRoutine;

export type Notification = {
  id: string;
  motherId: string;
  type: "morning_recommendation" | "evening_recommendation" | "daily_task" | "general" | "report_decision";
  title: string;
  message?: string;
  content?: string; // Alternative to message for report_decision type
  date?: string; // YYYY-MM-DD for journal-based notifications
  time?: "morning" | "night"; // For recommendation notifications
  read: boolean;
  createdAt: string;
};

export type AdminActivity = {
  id: string;
  adminId: string;
  adminEmail: string;
  adminType: "super_admin" | "editor";
  action: string; // e.g., "approve_doctor", "reject_doctor", "pause_user", "delete_user", "update_report", etc.
  targetType: "doctor" | "mother" | "question" | "report" | "editor" | "system";
  targetId: string;
  details: Record<string, any>; // Additional details about the action
  timestamp: string;
  ipAddress?: string;
};

const motherKey = (id: string) => `mothers/${id}.json`;
const doctorKey = (id: string) => `doctors/${id}.json`;
const editorKey = (id: string) => `editors/${id}.json`;
const questionKey = (id: string) => `questions/${id}.json`;
const chatHistoryKey = (motherId: string) => `chat-history/${motherId}.json`;
const dailyEntryKey = (motherId: string, entryId: string) => `daily-entries/${motherId}/${entryId}.json`;
const dailyQuestionKey = (motherId: string, questionId: string) => `daily-questions/${motherId}/${questionId}.json`;
const dailyQuestionSessionKey = (motherId: string, date: string) => `daily-question-sessions/${motherId}/${date}.json`;
const foodRecommendationKey = (motherId: string, date: string) => `food-recommendations/${motherId}/${date}.json`;
const patientKey = (hospitalClinicName: string, patientId: string) => `patients/${encodeURIComponent(hospitalClinicName)}/${patientId}.json`;
const notificationKey = (motherId: string, id: string) => `notifications/${motherId}/${id}.json`;
const liveChatConversationKey = (id: string) => `live-chat/conversations/${id}.json`;
const adminActivityKey = (id: string) => `admin-activities/${id}.json`;
const adminSettingsKey = "admin-settings.json";

async function listJson<T>(prefix: string): Promise<T[]> {
  try {
    const objects = await listObjects(prefix);
    console.log(`[Data] listJson: Found ${objects.length} objects with prefix "${prefix}"`);

    // Only keep JSON objects to avoid parsing images/binary files
    const jsonObjects = (objects || []).filter((obj) => obj.Key && obj.Key.endsWith(".json"));
    if (jsonObjects.length !== (objects || []).length) {
      console.warn(`[Data] listJson: Skipping ${objects.length - jsonObjects.length} non-JSON object(s) under prefix "${prefix}"`);
    }

    const items = await Promise.all(
      jsonObjects.map(async (obj) => {
        try {
          const key = obj.Key!;
          const item = await getJson<T>(key);
          if (!item) {
            console.warn(`[Data] listJson: Object ${key} returned null`);
          }
          return item;
        } catch (err) {
          console.error(`[Data] Error loading object ${obj.Key}:`, err);
          return null;
        }
      }),
    );
    const validItems = items.filter(Boolean) as T[];
    console.log(`[Data] listJson: Successfully loaded ${validItems.length} valid items from ${items.length} total`);
    return validItems;
  } catch (err) {
    console.error(`[Data] Error listing objects with prefix ${prefix}:`, err);
    // Return empty array instead of throwing - allows registration to proceed
    // if R2 is temporarily unavailable
    return [];
  }
}

export async function findMotherByEmail(email: string) {
  try {
    const mothers = await listJson<MotherProfile>("mothers/");
    return mothers.find((m) => m.email.toLowerCase() === email.toLowerCase()) || null;
  } catch (err) {
    console.error("Error finding mother by email:", err);
    // Return null to allow registration to proceed
    return null;
  }
}

export async function findDoctorByEmail(email: string) {
  try {
    const doctors = await listJson<DoctorProfile>("doctors/");
    return doctors.find((d) => d.email.toLowerCase() === email.toLowerCase()) || null;
  } catch (err) {
    console.error("Error finding doctor by email:", err);
    // Return null to allow registration to proceed if check fails
    // This prevents blocking registration due to R2 issues
    return null;
  }
}

export async function getMother(id: string) {
  return getJson<MotherProfile>(motherKey(id));
}

export async function saveMother(profile: MotherProfile) {
  return putJson(motherKey(profile.id), profile);
}

export async function getDoctor(id: string) {
  return getJson<DoctorProfile>(doctorKey(id));
}

export async function saveDoctor(profile: DoctorProfile) {
  return putJson(doctorKey(profile.id), profile);
}

export async function getEditor(id: string) {
  return getJson<EditorProfile>(editorKey(id));
}

export async function saveEditor(profile: EditorProfile) {
  return putJson(editorKey(profile.id), profile);
}

export async function findEditorByEmail(email: string) {
  try {
    const editors = await listJson<EditorProfile>("editors/");
    return editors.find((e) => e.email.toLowerCase() === email.toLowerCase() && e.status !== "deleted") || null;
  } catch (err) {
    console.error("Error finding editor by email:", err);
    return null;
  }
}

export async function listAllEditors() {
  try {
    const editors = await listJson<EditorProfile>("editors/");
    // Filter out deleted editors
    return editors.filter((e) => e.status !== "deleted");
  } catch (err) {
    console.error("[Data] Error in listAllEditors:", err);
    return [];
  }
}

export async function getQuestion(id: string) {
  return getJson<Question>(questionKey(id));
}

export async function saveQuestion(question: Question) {
  return putJson(questionKey(question.id), question);
}

export async function listMotherQuestions(motherId: string) {
  const questions = await listJson<Question>("questions/");
  return questions.filter((q) => q.motherId === motherId);
}

export async function listAllQuestions() {
  return listJson<Question>("questions/");
}

export async function listAllMothers() {
  return listJson<MotherProfile>("mothers/");
}

export async function listAllDoctors() {
  try {
    const doctors = await listJson<DoctorProfile>("doctors/");
    console.log(`[Data] listAllDoctors: Found ${doctors.length} doctors`);
    return doctors;
  } catch (err) {
    console.error("[Data] Error in listAllDoctors:", err);
    // Return empty array instead of throwing to prevent breaking admin dashboard
    return [];
  }
}

export async function deleteDoctor(doctorId: string) {
  const { deleteObject, listObjects } = await import("./r2Client");
  const doctorKey = `doctors/${doctorId}.json`;
  
  // Get doctor data before deletion to clean up related data
  const doctor = await getDoctor(doctorId);
  
  // Delete doctor profile
  await deleteObject(doctorKey);
  
  // Delete profile picture if exists
  if (doctor?.profilePicture) {
    try {
      await deleteObject(doctor.profilePicture);
    } catch (err) {
      // Ignore errors if picture doesn't exist
    }
  }
  
  // Delete all questions answered by this doctor
  try {
    const allQuestions = await listAllQuestions();
    const doctorQuestions = allQuestions.filter(q => q.doctorId === doctorId);
    for (const question of doctorQuestions) {
      // Remove doctor's answer but keep the question
      const updated = {
        ...question,
        answer: undefined,
        doctorId: undefined,
        answeredAt: undefined,
      };
      await saveQuestion(updated);
    }
  } catch (err) {
    console.error("Error cleaning up doctor questions:", err);
  }
  
  // Delete all comments by this doctor
  try {
    const allQuestions = await listAllQuestions();
    for (const question of allQuestions) {
      if (question.comments && question.comments.length > 0) {
        let updated = false;
        // Remove doctor's top-level comments
        const filteredComments = question.comments.filter(c => !(c.authorId === doctorId && c.authorRole === "doctor"));
        
        // Remove doctor's replies
        const cleanedComments = filteredComments.map(comment => {
          if (comment.replies && comment.replies.length > 0) {
            const filteredReplies = comment.replies.filter(r => !(r.authorId === doctorId && r.authorRole === "doctor"));
            if (filteredReplies.length !== comment.replies.length) {
              updated = true;
              return { ...comment, replies: filteredReplies };
            }
          }
          return comment;
        });
        
        if (filteredComments.length !== question.comments.length || updated) {
          await saveQuestion({ ...question, comments: cleanedComments });
        }
      }
    }
  } catch (err) {
    console.error("Error cleaning up doctor comments:", err);
  }
}

export async function deleteMother(motherId: string) {
  const { deleteObject, listObjects } = await import("./r2Client");
  const motherKey = `mothers/${motherId}.json`;
  
  // Delete mother profile
  await deleteObject(motherKey);
  
  // Delete all related data: prescriptions, journal entries, notifications, chat history
  try {
    // Delete prescriptions
    const prescriptionPrefix = `prescriptions/${motherId}/`;
    const prescriptionObjects = await listObjects(prescriptionPrefix);
    for (const obj of prescriptionObjects) {
      try {
        await deleteObject(obj.Key!);
      } catch (err) {
        // Ignore errors
      }
    }
    // Delete daily entries
    const dailyEntriesPrefix = `daily-entries/${motherId}/`;
    const dailyEntryObjects = await listObjects(dailyEntriesPrefix);
    for (const obj of dailyEntryObjects) {
      try {
        await deleteObject(obj.Key!);
      } catch (err) {
        // Ignore errors
      }
    }
    // Delete notifications
    const notificationPrefix = `notifications/${motherId}/`;
    const notificationObjects = await listObjects(notificationPrefix);
    for (const obj of notificationObjects) {
      try {
        await deleteObject(obj.Key!);
      } catch (err) {
        // Ignore errors
      }
    }
    // Delete chat history
    try {
      await deleteObject(`chat-history/${motherId}.json`);
    } catch (err) {
      // Ignore if doesn't exist
    }
  } catch (err) {
    console.error("Error deleting mother related data:", err);
    // Continue even if cleanup fails
  }
  
  // Delete all questions asked by this mother
  try {
    const allQuestions = await listAllQuestions();
    const motherQuestions = allQuestions.filter(q => q.motherId === motherId);
    for (const question of motherQuestions) {
      await deleteObject(`questions/${question.id}.json`);
    }
  } catch (err) {
    console.error("Error deleting mother questions:", err);
  }
  
  // Remove mother's comments from all questions
  try {
    const allQuestions = await listAllQuestions();
    for (const question of allQuestions) {
      if (question.comments && question.comments.length > 0) {
        let updated = false;
        // Remove mother's top-level comments
        const filteredComments = question.comments.filter(c => !(c.authorId === motherId && c.authorRole === "mother"));
        
        // Remove mother's replies
        const cleanedComments = filteredComments.map(comment => {
          if (comment.replies && comment.replies.length > 0) {
            const filteredReplies = comment.replies.filter(r => !(r.authorId === motherId && r.authorRole === "mother"));
            if (filteredReplies.length !== comment.replies.length) {
              updated = true;
              return { ...comment, replies: filteredReplies };
            }
          }
          return comment;
        });
        
        if (filteredComments.length !== question.comments.length || updated) {
          await saveQuestion({ ...question, comments: cleanedComments });
        }
      }
    }
  } catch (err) {
    console.error("Error cleaning up mother comments:", err);
  }
}

// Chat History Functions
export async function getChatHistory(motherId: string): Promise<ChatHistory | null> {
  try {
    return await getJson<ChatHistory>(chatHistoryKey(motherId));
  } catch (err) {
    // Return null if no history exists yet
    return null;
  }
}

export async function saveChatHistory(history: ChatHistory) {
  return putJson(chatHistoryKey(history.motherId), history);
}

export async function updateChatHistory(motherId: string, messages: ChatMessage[]) {
  const history: ChatHistory = {
    motherId,
    messages,
    updatedAt: new Date().toISOString(),
  };
  return saveChatHistory(history);
}

// Conversation Functions (Multi-conversation support)
const conversationKey = (motherId: string, conversationId: string) =>
  `conversations/${motherId}/${conversationId}.json`;

const conversationsListKey = (motherId: string) =>
  `conversations/${motherId}/list.json`;

export async function getConversationsList(motherId: string): Promise<{ id: string; title: string; updatedAt: string; }[]> {
  try {
    const list = await getJson<{ conversations: { id: string; title: string; updatedAt: string; }[] }>(conversationsListKey(motherId));
    return list?.conversations || [];
  } catch (err) {
    return [];
  }
}

export async function saveConversationsList(motherId: string, conversations: { id: string; title: string; updatedAt: string; }[]) {
  return putJson(conversationsListKey(motherId), { conversations });
}

export async function getConversation(motherId: string, conversationId: string): Promise<Conversation | null> {
  try {
    return await getJson<Conversation>(conversationKey(motherId, conversationId));
  } catch (err) {
    return null;
  }
}

export async function saveConversation(conversation: Conversation) {
  // Save the conversation
  await putJson(conversationKey(conversation.motherId, conversation.id), conversation);
  
  // Update the conversations list
  const list = await getConversationsList(conversation.motherId);
  const existingIndex = list.findIndex(c => c.id === conversation.id);
  
  const listItem = {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt,
  };
  
  if (existingIndex >= 0) {
    list[existingIndex] = listItem;
  } else {
    list.unshift(listItem); // Add to beginning
  }
  
  await saveConversationsList(conversation.motherId, list);
}

export async function deleteConversation(motherId: string, conversationId: string) {
  const { deleteObject } = await import("./r2Client");
  
  // Delete the conversation file
  await deleteObject(conversationKey(motherId, conversationId));
  
  // Update the list
  const list = await getConversationsList(motherId);
  const filtered = list.filter(c => c.id !== conversationId);
  await saveConversationsList(motherId, filtered);
}

export async function createConversation(motherId: string, firstUserMessage: string): Promise<Conversation> {
  const { v4: uuid } = await import("uuid");
  const conversationId = uuid();
  
  // Generate title from first message (first 50 chars)
  const title = firstUserMessage.length > 50 
    ? firstUserMessage.substring(0, 50) + "..." 
    : firstUserMessage;
  
  const conversation: Conversation = {
    id: conversationId,
    motherId,
    title,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await saveConversation(conversation);
  return conversation;
}

// Daily Entry Functions
export async function getDailyEntry(motherId: string, entryId: string): Promise<DailyEntry | null> {
  try {
    return await getJson<DailyEntry>(dailyEntryKey(motherId, entryId));
  } catch (err) {
    return null;
  }
}

export async function saveDailyEntry(entry: DailyEntry) {
  return putJson(dailyEntryKey(entry.motherId, entry.id), entry);
}

export async function listDailyEntries(motherId: string): Promise<DailyEntry[]> {
  try {
    return await listJson<DailyEntry>(`daily-entries/${motherId}/`);
  } catch (err) {
    return [];
  }
}

export async function listDailyEntriesByDate(motherId: string, date: string): Promise<DailyEntry[]> {
  try {
    const allEntries = await listDailyEntries(motherId);
    return allEntries.filter(entry => entry.date === date);
  } catch (err) {
    return [];
  }
}

export async function deleteDailyEntry(motherId: string, entryId: string): Promise<void> {
  try {
    const { deleteObject } = await import("./r2Client");
    await deleteObject(dailyEntryKey(motherId, entryId));
  } catch (err) {
    console.error("Error deleting daily entry:", err);
  }
}

// Food Recommendation Functions
export async function getFoodRecommendation(motherId: string, date: string): Promise<FoodRecommendation | null> {
  try {
    return await getJson<FoodRecommendation>(foodRecommendationKey(motherId, date));
  } catch (err) {
    return null;
  }
}

export async function saveFoodRecommendation(recommendation: FoodRecommendation) {
  return putJson(foodRecommendationKey(recommendation.motherId, recommendation.date), recommendation);
}

export async function listFoodRecommendations(motherId: string): Promise<FoodRecommendation[]> {
  try {
    return await listJson<FoodRecommendation>(`food-recommendations/${motherId}/`);
  } catch (err) {
    return [];
  }
}

export async function getFoodRecommendationByDate(motherId: string, date: string): Promise<FoodRecommendation | null> {
  try {
    return await getFoodRecommendation(motherId, date);
  } catch (err) {
    return null;
  }
}

// Notification Functions
export async function getNotifications(motherId: string): Promise<Notification[]> {
  try {
    return await listJson<Notification>(`notifications/${motherId}/`);
  } catch (err) {
    return [];
  }
}

export async function saveNotification(notification: Notification) {
  return putJson(notificationKey(notification.motherId, notification.id), notification);
}

export async function markNotificationAsRead(motherId: string, notificationId: string) {
  try {
    const notifications = await getNotifications(motherId);
    const notification = notifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
      await saveNotification(notification);
    }
  } catch (err) {
    console.error("Error marking notification as read:", err);
  }
}

export async function deleteNotification(motherId: string, notificationId: string): Promise<void> {
  try {
    const { deleteObject } = await import("./r2Client");
    await deleteObject(notificationKey(motherId, notificationId));
  } catch (err) {
    console.error("Error deleting notification:", err);
  }
}

// Live Chat Functions
export async function getLiveChatConversation(conversationId: string): Promise<LiveChatConversation | null> {
  try {
    return await getJson<LiveChatConversation>(liveChatConversationKey(conversationId));
  } catch (err) {
    return null;
  }
}

export async function saveLiveChatConversation(conversation: LiveChatConversation) {
  return putJson(liveChatConversationKey(conversation.id), conversation);
}

export async function listLiveChatConversations(): Promise<LiveChatConversation[]> {
  try {
    return await listJson<LiveChatConversation>("live-chat/conversations/");
  } catch (err) {
    return [];
  }
}

export async function getConversationsBySession(sessionId: string): Promise<LiveChatConversation[]> {
  try {
    const all = await listLiveChatConversations();
    return all.filter(conv => conv.sessionId === sessionId);
  } catch (err) {
    return [];
  }
}

export async function getConversationsByUserId(userId: string): Promise<LiveChatConversation[]> {
  try {
    const all = await listLiveChatConversations();
    return all.filter(conv => conv.userId === userId);
  } catch (err) {
    return [];
  }
}

export async function deleteLiveChatConversation(conversationId: string): Promise<void> {
  try {
    const { deleteObject } = await import("./r2Client");
    await deleteObject(liveChatConversationKey(conversationId));
  } catch (err) {
    console.error("Error deleting live chat conversation:", err);
    throw err;
  }
}

// Admin Activity Logging Functions
export async function logAdminActivity(activity: AdminActivity): Promise<void> {
  try {
    await putJson(adminActivityKey(activity.id), activity);
  } catch (err) {
    console.error("Error logging admin activity:", err);
    // Don't throw - logging failures shouldn't break the main operation
  }
}

export async function listAdminActivities(adminId?: string, limit?: number): Promise<AdminActivity[]> {
  try {
    const all = await listJson<AdminActivity>("admin-activities/");
    let filtered = all;
    
    if (adminId) {
      filtered = filtered.filter(activity => activity.adminId === adminId);
    }
    
    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (limit) {
      filtered = filtered.slice(0, limit);
    }
    
    return filtered;
  } catch (err) {
    console.error("Error listing admin activities:", err);
    return [];
  }
}

export async function getAdminActivity(activityId: string): Promise<AdminActivity | null> {
  try {
    return await getJson<AdminActivity>(adminActivityKey(activityId));
  } catch (err) {
    console.error("Error getting admin activity:", err);
    return null;
  }
}

// Password Reset Token Types and Functions
export type PasswordResetToken = {
  token: string;
  email: string;
  role: "mother" | "doctor";
  expiresAt: string; // ISO timestamp
  createdAt: string;
  used: boolean;
};

function passwordResetTokenKey(token: string): string {
  return `password-reset-tokens/${token}.json`;
}

export async function savePasswordResetToken(tokenData: PasswordResetToken): Promise<void> {
  try {
    await putJson(passwordResetTokenKey(tokenData.token), tokenData);
  } catch (err) {
    console.error("Error saving password reset token:", err);
    throw err;
  }
}

export async function getPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
  try {
    return await getJson<PasswordResetToken>(passwordResetTokenKey(token));
  } catch (err) {
    console.error("Error getting password reset token:", err);
    return null;
  }
}

export async function markTokenAsUsed(token: string): Promise<void> {
  try {
    const tokenData = await getPasswordResetToken(token);
    if (tokenData) {
      tokenData.used = true;
      await putJson(passwordResetTokenKey(token), tokenData);
    }
  } catch (err) {
    console.error("Error marking token as used:", err);
  }
}

// Patient Data Functions (for nurses/others)
export async function savePatient(patient: PatientData): Promise<void> {
  try {
    await putJson(patientKey(patient.hospitalClinicName, patient.id), patient);
  } catch (err) {
    console.error("Error saving patient:", err);
    throw err;
  }
}

export async function getPatient(hospitalClinicName: string, patientId: string): Promise<PatientData | null> {
  try {
    return await getJson<PatientData>(patientKey(hospitalClinicName, patientId));
  } catch (err) {
    console.error("Error getting patient:", err);
    return null;
  }
}

export async function listPatients(hospitalClinicName: string): Promise<PatientData[]> {
  try {
    return await listJson<PatientData>(`patients/${encodeURIComponent(hospitalClinicName)}/`);
  } catch (err) {
    console.error("Error listing patients:", err);
    return [];
  }
}

export async function deletePatient(hospitalClinicName: string, patientId: string): Promise<void> {
  try {
    const key = patientKey(hospitalClinicName, patientId);
    const { deleteObject } = await import("./r2Client");
    await deleteObject(key);
  } catch (err) {
    console.error("Error deleting patient:", err);
    throw err;
  }
}

export async function searchPatients(hospitalClinicName: string, query: string): Promise<PatientData[]> {
  try {
    const allPatients = await listPatients(hospitalClinicName);
    const lowerQuery = query.toLowerCase();
    return allPatients.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.phone.includes(query) ||
        (p.email && p.email.toLowerCase().includes(lowerQuery))
    );
  } catch (err) {
    console.error("Error searching patients:", err);
    return [];
  }
}

// Daily Question Functions
export async function saveDailyQuestion(question: DailyQuestion): Promise<void> {
  try {
    await putJson(dailyQuestionKey(question.motherId, question.id), question);
  } catch (err) {
    console.error("Error saving daily question:", err);
    throw err;
  }
}

export async function getDailyQuestion(motherId: string, questionId: string): Promise<DailyQuestion | null> {
  try {
    return await getJson<DailyQuestion>(dailyQuestionKey(motherId, questionId));
  } catch (err) {
    console.error("Error getting daily question:", err);
    return null;
  }
}

export async function listDailyQuestions(motherId: string, date?: string): Promise<DailyQuestion[]> {
  try {
    const questions = await listJson<DailyQuestion>(`daily-questions/${motherId}/`);
    if (date) {
      return questions.filter(q => q.date === date);
    }
    return questions;
  } catch (err) {
    console.error("Error listing daily questions:", err);
    return [];
  }
}

export async function getDailyQuestionSession(motherId: string, date: string): Promise<DailyQuestionSession | null> {
  try {
    return await getJson<DailyQuestionSession>(dailyQuestionSessionKey(motherId, date));
  } catch (err) {
    console.error("Error getting daily question session:", err);
    return null;
  }
}

export async function saveDailyQuestionSession(session: DailyQuestionSession): Promise<void> {
  try {
    await putJson(dailyQuestionSessionKey(session.motherId, session.date), session);
  } catch (err) {
    console.error("Error saving daily question session:", err);
    throw err;
  }
}

// Admin Settings Type and Functions
export type AdminSettings = {
  morningRecommendationHour: number; // Default: 8
  morningRecommendationMinute: number; // Default: 0
  eveningRecommendationHour: number; // Default: 20 (8 PM)
  eveningRecommendationMinute: number; // Default: 0
  questionHour: number; // Default: 21 (9 PM)
  questionMinute: number; // Default: 0
  questionsPerDay: number; // Default: 10
  dailyQuestionsEnabled: boolean; // Default: true - Toggle to enable/disable daily questions
  updatedAt: string;
  updatedBy: string; // Admin email
};

export async function getAdminSettings(): Promise<AdminSettings> {
  try {
    const settings = await getJson<AdminSettings>(adminSettingsKey);
    if (settings) {
      return settings;
    }
    // Return defaults if not set
    return {
      morningRecommendationHour: 8,
      morningRecommendationMinute: 0,
      eveningRecommendationHour: 20,
      eveningRecommendationMinute: 0,
      questionHour: 21,
      questionMinute: 0,
      questionsPerDay: 10,
      dailyQuestionsEnabled: true, // Default: enabled
      updatedAt: new Date().toISOString(),
      updatedBy: "system",
    };
  } catch (err) {
    console.error("Error getting admin settings:", err);
    // Return defaults on error
    return {
      morningRecommendationHour: 8,
      morningRecommendationMinute: 0,
      eveningRecommendationHour: 20,
      eveningRecommendationMinute: 0,
      questionHour: 21,
      questionMinute: 0,
      questionsPerDay: 10,
      dailyQuestionsEnabled: true, // Default: enabled
      updatedAt: new Date().toISOString(),
      updatedBy: "system",
    };
  }
}

export async function saveAdminSettings(settings: AdminSettings): Promise<void> {
  try {
    await putJson(adminSettingsKey, settings);
  } catch (err) {
    console.error("Error saving admin settings:", err);
    throw err;
  }
}

