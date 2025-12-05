import { NextRequest, NextResponse } from "next/server";
import { askMomsCare } from "@/lib/momsCareChat";
import { getUserFromRequest } from "@/lib/auth";
import { getMother } from "@/lib/data";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const messages = body.messages || [];
  const user = getUserFromRequest(req);

  let profileContext: string | undefined = body.profileContext;
  if (!profileContext && user?.role === "mother") {
    const mother = await getMother(user.id);
    if (mother) {
      profileContext = `
Name: ${mother.name || "N/A"}
Weeks pregnant: ${mother.weeksPregnant || "N/A"}
Due date: ${mother.dueDate || "N/A"}
Conditions: ${mother.conditions || "N/A"}
Medications: ${mother.medications || "N/A"}`;
    }
  }

  const reply = await askMomsCare(messages, profileContext);
  return NextResponse.json({ reply });
}

