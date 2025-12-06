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
  createdAt: string;
  updatedAt: string;
};

export type ProfileChange = {
  field: string;
  oldValue: string | undefined;
  newValue: string | undefined;
};

export type DoctorProfile = {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  phone?: string;
  specialty?: string;
  bmdcNumber?: string; // BMDC Registration Number
  clinicName?: string; // Clinic/Hospital name
  clinicAddress?: string;
  profilePicture?: string; // URL to profile picture in R2
  qualification?: string; // Medical qualifications
  experience?: string; // Years of experience
  status: "pending" | "approved" | "rejected" | "paused";
  verificationComment?: string; // Admin's comment on verification
  pendingVerification?: boolean; // True when profile is edited and needs re-verification
  previousValues?: Partial<DoctorProfile>; // Store previous values before changes
  changes?: ProfileChange[]; // Track what fields were changed
  createdAt: string;
  updatedAt: string;
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

export type DailyEntry = {
  id: string;
  motherId: string;
  date: string; // YYYY-MM-DD format
  entry: string; // Mother's daily entry (English, Bangla, or Banglish)
  createdAt: string;
  updatedAt: string;
};

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

const motherKey = (id: string) => `mothers/${id}.json`;
const doctorKey = (id: string) => `doctors/${id}.json`;
const questionKey = (id: string) => `questions/${id}.json`;
const chatHistoryKey = (motherId: string) => `chat-history/${motherId}.json`;
const dailyEntryKey = (motherId: string, entryId: string) => `daily-entries/${motherId}/${entryId}.json`;
const notificationKey = (motherId: string, id: string) => `notifications/${motherId}/${id}.json`;

async function listJson<T>(prefix: string): Promise<T[]> {
  try {
    const objects = await listObjects(prefix);
    console.log(`[Data] listJson: Found ${objects.length} objects with prefix "${prefix}"`);
    const items = await Promise.all(
      (objects || []).map(async (obj) => {
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

