import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getMother, listAllQuestions } from "@/lib/data";
import { listObjects, signedUrl } from "@/lib/r2Client";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only doctors can view questions, not nurses/others
  const { getDoctor } = await import("@/lib/data");
  const doctor = await getDoctor(user.id);
  if (!doctor || doctor.role !== "doctor") {
    return NextResponse.json({ error: "Only doctors can view questions" }, { status: 403 });
  }

  const allQuestions = await listAllQuestions();
  
  // Filter: Only show unanswered questions OR questions answered by this doctor
  const filteredQuestions = allQuestions.filter(
    (q) => !q.answer || q.doctorId === user.id
  );

  const enriched = await Promise.all(
    filteredQuestions.map(async (q) => {
      const mother = await getMother(q.motherId);
      const prefix = `prescriptions/${q.motherId}/`;
      const objects = await listObjects(prefix);
      const prescriptions =
        await Promise.all((objects || []).map(async (obj) => ({
          key: obj.Key!,
          url: await signedUrl(obj.Key!),
        })));

      const { passwordHash, ...motherSafe } = mother || ({} as any);
      
      // Check for new activity
      const lastSeen = q.lastSeenByDoctor ? new Date(q.lastSeenByDoctor).getTime() : 0;
      const answerTime = q.answeredAt ? new Date(q.answeredAt).getTime() : 0;
      const latestCommentTime = q.comments && q.comments.length > 0
        ? Math.max(...q.comments.map(c => new Date(c.createdAt).getTime()))
        : 0;
      
      const hasNewActivity = (answerTime > lastSeen && q.doctorId !== user.id) || 
                            (latestCommentTime > lastSeen && q.comments?.some(c => c.authorRole === "mother"));
      
      return {
        ...q,
        mother: mother ? {
          ...motherSafe,
          // Include all fields
          phone: mother.phone,
          address: mother.address,
          bloodGroup: mother.bloodGroup,
          previousPregnancies: mother.previousPregnancies,
          allergies: mother.allergies,
          emergencyContact: mother.emergencyContact,
          emergencyPhone: mother.emergencyPhone,
        } : undefined,
        prescriptions,
        comments: q.comments || [],
        hasNewActivity,
      };
    }),
  );

  const sorted = enriched.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return NextResponse.json({ questions: sorted });
}

