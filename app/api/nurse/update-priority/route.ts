import { NextRequest, NextResponse } from "next/server";
import { listPatients, savePatient, PatientData } from "@/lib/data";
import { groq, isGroqConfigured } from "@/lib/groqClient";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hospitalClinicName } = body;

    if (!hospitalClinicName) {
      return NextResponse.json({ error: "Hospital/Clinic name required" }, { status: 400 });
    }

    const patients = await listPatients(hospitalClinicName);
    
    if (patients.length === 0) {
      return NextResponse.json({ success: true, message: "No patients to update" });
    }

    // Use AI to calculate priorities if available, otherwise use basic calculation
    const updatedPatients = await Promise.all(
      patients.map(async (patient) => {
        if (isGroqConfigured()) {
          try {
            const priority = await calculateAIPriority(patient);
            return {
              ...patient,
              priorityScore: priority.score,
              priorityReason: priority.reason,
              lastPriorityCheck: new Date().toISOString(),
            };
          } catch (err) {
            console.error(`Error calculating AI priority for patient ${patient.id}:`, err);
            // Fallback to basic priority
            return calculateBasicPriority(patient);
          }
        } else {
          return calculateBasicPriority(patient);
        }
      })
    );

    // Save updated patients
    await Promise.all(updatedPatients.map((p) => savePatient(p)));

    return NextResponse.json({ 
      success: true, 
      updated: updatedPatients.length 
    });
  } catch (error: any) {
    console.error("Error updating priorities:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update priorities" },
      { status: 500 }
    );
  }
}

async function calculateAIPriority(patient: PatientData): Promise<{ score: number; reason: string }> {
  const patientSummary = `
Patient: ${patient.name}
Age: ${patient.age || "Not specified"}
Phone: ${patient.phone}
Medical History: ${patient.medicalHistory || "None"}
Allergies: ${patient.allergies || "None"}
Current Medications: ${patient.currentMedications || "None"}
Blood Group: ${patient.bloodGroup || "Not specified"}
Prescriptions: ${patient.prescriptions?.length || 0} files
Reports: ${patient.reports?.length || 0} files
Documents: ${patient.documents?.length || 0} files
Emergency Contact: ${patient.emergencyContact ? "Yes" : "No"}
Notes: ${patient.notes || "None"}
  `.trim();

  const prompt = `You are a medical priority assessment AI. Analyze the following patient information and determine their priority level (0-100) and a brief reason.

${patientSummary}

Respond in JSON format:
{
  "score": <number between 0-100>,
  "reason": "<1-2 sentence explanation in English or Bangla>"
}

Priority factors:
- Critical medical conditions (diabetes, hypertension, heart disease, etc.)
- Missing emergency contact information
- Number of medical records (indicates active care needs)
- Age (elderly patients may need more attention)
- Allergies and medication needs
- Recent activity or lack thereof

Higher score = higher priority.`;

  const response = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a medical priority assessment assistant. Always respond with valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    max_tokens: 200,
  });

  const content = response.choices[0]?.message?.content?.trim() || "";
  
  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      score: Math.min(Math.max(parsed.score || 0, 0), 100),
      reason: parsed.reason || "Regular follow-up needed",
    };
  }

  // Fallback
  const result = calculateBasicPriority(patient);
  return {
    score: result.priorityScore || 0,
    reason: result.priorityReason || "Regular follow-up needed",
  };
}

function calculateBasicPriority(patient: PatientData): PatientData {
  let score = 0;
  const reasons: string[] = [];

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

  const totalFiles = (patient.prescriptions?.length || 0) + (patient.reports?.length || 0);
  if (totalFiles > 5) {
    score += 20;
    reasons.push("Multiple medical records");
  }

  if (!patient.emergencyContact || !patient.emergencyPhone) {
    score += 10;
    reasons.push("Missing emergency contact");
  }

  if (patient.age && patient.age > 60) {
    score += 15;
    reasons.push("Elderly patient");
  }

  return {
    ...patient,
    priorityScore: Math.min(score, 100),
    priorityReason: reasons.length > 0 ? reasons.join(", ") : "Regular follow-up needed",
    lastPriorityCheck: new Date().toISOString(),
  };
}

