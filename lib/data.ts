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
  weeksPregnant?: number;
  dueDate?: string;
  conditions?: string;
  medications?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  previousPregnancies?: number;
  allergies?: string;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
};

export type Question = {
  id: string;
  motherId: string;
  question: string;
  answer?: string;
  doctorId?: string;
  createdAt: string;
  answeredAt?: string;
};

const motherKey = (id: string) => `mothers/${id}.json`;
const doctorKey = (id: string) => `doctors/${id}.json`;
const questionKey = (id: string) => `questions/${id}.json`;

async function listJson<T>(prefix: string): Promise<T[]> {
  const objects = await listObjects(prefix);
  const items = await Promise.all(
    (objects || []).map(async (obj) => {
      const key = obj.Key!;
      return getJson<T>(key);
    }),
  );
  return items.filter(Boolean) as T[];
}

export async function findMotherByEmail(email: string) {
  const mothers = await listJson<MotherProfile>("mothers/");
  return mothers.find((m) => m.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function findDoctorByEmail(email: string) {
  const doctors = await listJson<DoctorProfile>("doctors/");
  return doctors.find((d) => d.email.toLowerCase() === email.toLowerCase()) || null;
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
  return listJson<DoctorProfile>("doctors/");
}

