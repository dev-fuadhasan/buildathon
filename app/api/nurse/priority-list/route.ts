import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listPatients, PatientData } from "@/lib/data";

type PriorityPatient = {
  patient: PatientData;
  priorityScore: number;
  priorityReason: string;
};

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { getDoctor } = await import("@/lib/data");
    const doctor = await getDoctor(user.id);
    if (!doctor || !doctor.hospitalClinicName) {
      return NextResponse.json({ error: "Hospital/Clinic name not found" }, { status: 400 });
    }

    if (doctor.role === "doctor") {
      return NextResponse.json({ error: "Only health workers can access priority list" }, { status: 403 });
    }

    const patients = await listPatients(doctor.hospitalClinicName);
    
    // If patients already have priority scores, use them
    // Otherwise, calculate new priorities
    const patientsWithPriority = patients.map((patient) => {
      if (patient.priorityScore !== undefined && patient.priorityReason) {
        return {
          patient,
          priorityScore: patient.priorityScore,
          priorityReason: patient.priorityReason,
        };
      }
      // Calculate basic priority (will be enhanced with AI)
      return calculateBasicPriority(patient);
    });

    // Sort by priority score (highest first) - High risk patients at top
    // Also consider risk level: high > medium > low
    const sorted = patientsWithPriority.sort((a, b) => {
      // First sort by priority score (highest first)
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      // If scores are equal, sort by risk indicators (high risk first)
      const aHasHighRisk = a.patient.medicalHistory?.toLowerCase().includes("diabetes") ||
                          a.patient.medicalHistory?.toLowerCase().includes("hypertension") ||
                          a.patient.medicalHistory?.toLowerCase().includes("heart");
      const bHasHighRisk = b.patient.medicalHistory?.toLowerCase().includes("diabetes") ||
                          b.patient.medicalHistory?.toLowerCase().includes("hypertension") ||
                          b.patient.medicalHistory?.toLowerCase().includes("heart");
      if (aHasHighRisk && !bHasHighRisk) return -1;
      if (!aHasHighRisk && bHasHighRisk) return 1;
      // Finally, sort by most recent update
      const dateA = new Date(a.patient.updatedAt || a.patient.createdAt || 0).getTime();
      const dateB = new Date(b.patient.updatedAt || b.patient.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ priorityList: sorted });
  } catch (error: any) {
    console.error("Error loading priority list:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load priority list" },
      { status: 500 }
    );
  }
}

function calculateBasicPriority(patient: PatientData): PriorityPatient {
  let score = 0;
  const reasons: string[] = [];

  // Check for critical conditions
  if (patient.medicalHistory?.toLowerCase().includes("diabetes")) {
    score += 30;
    reasons.push("Has diabetes");
  }
  if (patient.medicalHistory?.toLowerCase().includes("hypertension") || patient.medicalHistory?.toLowerCase().includes("high bp")) {
    score += 25;
    reasons.push("Has hypertension");
  }
  if (patient.allergies && patient.allergies.length > 0) {
    score += 15;
    reasons.push("Has allergies");
  }

  // Check for recent reports/prescriptions (indicates active care)
  const totalFiles = (patient.prescriptions?.length || 0) + (patient.reports?.length || 0);
  if (totalFiles > 5) {
    score += 20;
    reasons.push("Multiple medical records");
  }

  // Check for missing critical information
  if (!patient.emergencyContact || !patient.emergencyPhone) {
    score += 10;
    reasons.push("Missing emergency contact");
  }

  // Age factor (elderly patients may need more attention)
  if (patient.age && patient.age > 60) {
    score += 15;
    reasons.push("Elderly patient");
  }

  const reason = reasons.length > 0 
    ? reasons.join(", ") 
    : "Regular follow-up needed";

  return {
    patient,
    priorityScore: Math.min(score, 100), // Cap at 100
    priorityReason: reason,
  };
}

