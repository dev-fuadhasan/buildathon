import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { groq, isGroqConfigured } from "@/lib/groqClient";
import { saveCachedAIRisks } from "@/lib/dismissedRisksDB";

type AiRiskFactor = {
  category: string;
  factor: string;
  severity: "low" | "medium" | "high" | "critical";
  recommendation: string;
  points?: number;
};

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isGroqConfigured()) {
      return NextResponse.json({ riskFactors: [] });
    }

    const body = await req.json();
    const text = String(body?.text || "").trim();
    const profile = body?.profile || {};
    const textHash = body?.textHash; // Optional: for caching

    if (!text) {
      return NextResponse.json({ riskFactors: [] });
    }

    const prompt = `You are a medical risk analyst. Analyze the user's recent health messages and extract potential maternal health risk signals.

CRITICAL RULES:
- Do NOT rely on a fixed keyword list. Use clinical reasoning.
- Only include signals that could change maternal risk level.
- Return ONLY JSON. No extra text.

INPUT:
User text:
${text}

Profile context (optional):
Age: ${profile.age || "Unknown"}
Conditions: ${profile.conditions || "Unknown"}
Medications: ${profile.medications || "Unknown"}
Allergies: ${profile.allergies || "Unknown"}
Previous pregnancies: ${profile.previousPregnancies ?? "Unknown"}

OUTPUT JSON FORMAT:
{
  "riskFactors": [
    {
      "category": "AI Signal",
      "factor": "Short label of the signal",
      "severity": "low|medium|high|critical",
      "points": 5|10|20|30,
      "recommendation": "Short actionable guidance"
    }
  ]
}

If no risk signals exist, return {"riskFactors": []}.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      max_tokens: 400,
      messages: [
        { role: "system", content: "You output JSON only." },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices?.[0]?.message?.content || "";
    let parsed: { riskFactors?: AiRiskFactor[] } = {};

    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      }
    }

    const riskFactors = Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [];
    const normalized = riskFactors
      .filter((factor) => factor && factor.factor)
      .map((factor) => ({
        category: factor.category || "AI Signal",
        factor: String(factor.factor).slice(0, 120),
        severity: factor.severity || "medium",
        recommendation: String(factor.recommendation || "Consult a healthcare provider for guidance.").slice(0, 180),
        points:
          factor.points ||
          (factor.severity === "critical"
            ? 30
            : factor.severity === "high"
              ? 20
              : factor.severity === "medium"
                ? 10
                : 5),
        source: "symptoms" as const, // Mark as dismissible
      }));

    // Save to cloud cache if textHash provided (prevents different chips on different devices!)
    if (textHash && normalized.length > 0) {
      try {
        await saveCachedAIRisks(user.id, textHash, normalized);
      } catch (cacheErr) {
        console.error("[AI Risk] Failed to cache results:", cacheErr);
        // Continue even if caching fails
      }
    }

    return NextResponse.json({ riskFactors: normalized });
  } catch (error) {
    console.error("AI risk detection error:", error);
    return NextResponse.json({ riskFactors: [] }, { status: 200 });
  }
}
