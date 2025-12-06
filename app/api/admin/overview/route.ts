import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listAllDoctors, listAllMothers, listAllQuestions } from "@/lib/data";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [mothers, doctors, questions] = await Promise.all([
    listAllMothers(),
    listAllDoctors(),
    listAllQuestions(),
  ]);

  const overview = {
    mothers: mothers.length,
    doctors: doctors.filter((d) => d.status === "approved").length,
    pendingDoctors: doctors.filter((d) => d.status === "pending").length,
    questions: questions.length,
    answered: questions.filter((q) => q.answer).length,
  };

  return NextResponse.json({ overview });
}

