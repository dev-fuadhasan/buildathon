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
  status: "pending" | "approved" | "rejected";
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

export type DailyJournalEntry = {
  id: string;
  motherId: string;
  date: string; // YYYY-MM-DD format
  entry: string; // Mother's daily journal entry (English, Bangla, or Banglish)
  createdAt: string;
  updatedAt: string;
};

export type Notification = {
  id: string;
  motherId: string;
  type: "morning_recommendation" | "evening_recommendation" | "daily_task" | "general";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const motherKey = (id: string) => `mothers/${id}.json`;
const doctorKey = (id: string) => `doctors/${id}.json`;
const questionKey = (id: string) => `questions/${id}.json`;
const chatHistoryKey = (motherId: string) => `chat-history/${motherId}.json`;
const journalEntryKey = (motherId: string, date: string) => `journals/${motherId}/${date}.json`;
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
  const { deleteObject } = await import("./r2Client");
  const doctorKey = `doctors/${doctorId}.json`;
  await deleteObject(doctorKey);
  // Also delete profile picture if exists
  const doctor = await getDoctor(doctorId);
  if (doctor?.profilePicture) {
    try {
      await deleteObject(doctor.profilePicture);
    } catch (err) {
      // Ignore errors if picture doesn't exist
    }
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

// Daily Journal Functions
export async function getJournalEntry(motherId: string, date: string): Promise<DailyJournalEntry | null> {
  try {
    return await getJson<DailyJournalEntry>(journalEntryKey(motherId, date));
  } catch (err) {
    return null;
  }
}

export async function saveJournalEntry(entry: DailyJournalEntry) {
  return putJson(journalEntryKey(entry.motherId, entry.date), entry);
}

export async function listJournalEntries(motherId: string): Promise<DailyJournalEntry[]> {
  try {
    return await listJson<DailyJournalEntry>(`journals/${motherId}/`);
  } catch (err) {
    return [];
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

