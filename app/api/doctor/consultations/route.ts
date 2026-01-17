import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listDoctorConsultations, listAllDoctors } from "@/lib/data";

// GET: List all consultations for the doctor
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const consultations = await listDoctorConsultations(user.id);
    
    // Enrich with mother info
    const { listAllMothers } = await import("@/lib/data");
    const allMothers = await listAllMothers();
    
    const enriched = consultations.map(consultation => {
      const mother = allMothers.find(m => m.id === consultation.motherId);
      return {
        ...consultation,
        mother: mother ? {
          name: mother.name,
          email: mother.email,
          age: mother.age,
          phone: mother.phone,
        } : null,
      };
    });

    return NextResponse.json({ consultations: enriched });
  } catch (error: any) {
    console.error("Error listing consultations:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list consultations" },
      { status: 500 }
    );
  }
}
