import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getConsultation, getMother } from "@/lib/data";
import { getJson, listObjects, signedUrl } from "@/lib/r2Client";

// GET: Get patient details for an approved consultation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const consultation = await getConsultation(id);

    if (!consultation) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    }

    if (consultation.doctorId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (consultation.status !== "approved") {
      return NextResponse.json(
        { error: "Consultation must be approved to view patient details" },
        { status: 400 }
      );
    }

    // Get mother profile
    const mother = await getMother(consultation.motherId);
    if (!mother) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Get prescriptions
    const prescriptionPrefix = `prescriptions/${consultation.motherId}/`;
    const prescriptionObjects = await listObjects(prescriptionPrefix);
    
    const prescriptions = await Promise.all(
      prescriptionObjects
        .filter(obj => obj.Key && !obj.Key.endsWith('metadata.json') && !obj.Key.match(/_page\d+\.(jpg|jpeg|png)$/i))
        .map(async (obj) => {
          const url = await signedUrl(obj.Key!);
          return {
            key: obj.Key!,
            url,
            fileName: obj.Key!.split("/").pop() || "prescription",
          };
        })
    );

    // Get daily entries (journal)
    const dailyEntriesPrefix = `daily-entries/${consultation.motherId}/`;
    const dailyEntryObjects = await listObjects(dailyEntriesPrefix);
    
    const dailyEntries = await Promise.all(
      dailyEntryObjects.map(async (obj) => {
        try {
          const entry = await getJson<any>(obj.Key!);
          return entry;
        } catch {
          return null;
        }
      })
    );

    // Filter out nulls and sort by date
    const validEntries = dailyEntries
      .filter(e => e !== null)
      .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());

    return NextResponse.json({
      patient: {
        id: mother.id,
        name: mother.name,
        email: mother.email,
        age: mother.age,
        phone: mother.phone,
        address: mother.address,
        bloodGroup: mother.bloodGroup,
        pregnancyStatus: mother.pregnancyStatus,
        weeksPregnant: mother.weeksPregnant,
        daysPregnant: mother.daysPregnant,
        previousPregnancies: mother.previousPregnancies,
        conditions: mother.conditions,
        medications: mother.medications,
        allergies: mother.allergies,
        emergencyContact: mother.emergencyContact,
        emergencyPhone: mother.emergencyPhone,
      },
      prescriptions,
      dailyEntries: validEntries,
    });
  } catch (error: any) {
    console.error("Error getting patient details:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get patient details" },
      { status: 500 }
    );
  }
}
