import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listAllQuestions, getQuestion } from "@/lib/data";
import { getDoctor, getMother } from "@/lib/data";

/**
 * Get all reported questions/answers
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const allQuestions = await listAllQuestions();
    const reportedQuestions = allQuestions.filter(q => q.reported === true);

    // Enrich with doctor and mother details
    const enriched = await Promise.all(
      reportedQuestions.map(async (q) => {
        const doctor = q.doctorId ? await getDoctor(q.doctorId) : null;
        const mother = await getMother(q.motherId);
        
        return {
          ...q,
          doctor: doctor ? {
            id: doctor.id,
            name: doctor.name,
            email: doctor.email,
            specialty: doctor.specialty,
          } : null,
          mother: mother ? {
            id: mother.id,
            name: mother.name,
            email: mother.email,
          } : null,
        };
      })
    );

    return NextResponse.json({ reports: enriched });
  } catch (error: any) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

