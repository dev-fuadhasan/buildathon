import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getMother, listAllQuestions } from "@/lib/data";
import { listObjects, signedUrl } from "@/lib/r2Client";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const questions = await listAllQuestions();
  const enriched = await Promise.all(
    questions.map(async (q) => {
      const mother = await getMother(q.motherId);
      const prefix = `prescriptions/${q.motherId}/`;
      const objects = await listObjects(prefix);
      const prescriptions =
        await Promise.all((objects || []).map(async (obj) => ({
          key: obj.Key!,
          url: await signedUrl(obj.Key!),
        })));

      const { passwordHash, ...motherSafe } = mother || ({} as any);
      return {
        ...q,
        mother: mother ? motherSafe : undefined,
        prescriptions,
      };
    }),
  );

  const sorted = enriched.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return NextResponse.json({ questions: sorted });
}

