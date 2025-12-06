import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listAllMothers, listAllQuestions, getChatHistory } from "@/lib/data";
import { assessRisk } from "@/lib/riskPrediction";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [mothers, questions] = await Promise.all([
      listAllMothers(),
      listAllQuestions(),
    ]);

    // Risk Distribution Analysis
    const riskDistribution = {
      low: 0,
      medium: 0,
      high: 0,
    };

    const riskScores: number[] = [];
    const riskFactors: Record<string, number> = {};

    for (const mother of mothers) {
      const assessment = assessRisk(mother);
      riskDistribution[assessment.overallRisk]++;
      riskScores.push(assessment.riskScore);
      
      assessment.riskFactors.forEach((factor) => {
        riskFactors[factor.category] = (riskFactors[factor.category] || 0) + 1;
      });
    }

    // Geographic Distribution (based on address if available)
    const geographicData: Record<string, number> = {};
    mothers.forEach((mother) => {
      if (mother.address) {
        // Extract district/area from address (simplified)
        const parts = mother.address.split(",");
        const location = parts[parts.length - 1]?.trim() || "Unknown";
        geographicData[location] = (geographicData[location] || 0) + 1;
      }
    });

    // Trimester Distribution
    const trimesterDistribution = {
      first: 0,
      second: 0,
      third: 0,
      unknown: 0,
    };

    mothers.forEach((mother) => {
      // Use daysPregnant if available, otherwise calculate from weeksPregnant
      const daysPregnant = mother.daysPregnant || (mother.weeksPregnant ? mother.weeksPregnant * 7 : undefined);
      if (!daysPregnant) {
        trimesterDistribution.unknown++;
      } else {
        const weeksPregnant = Math.floor(daysPregnant / 7);
        if (weeksPregnant <= 12) {
          trimesterDistribution.first++;
        } else if (weeksPregnant <= 27) {
          trimesterDistribution.second++;
        } else {
          trimesterDistribution.third++;
        }
      }
    });

    // Age Distribution
    const ageGroups = {
      "Under 18": 0,
      "18-24": 0,
      "25-34": 0,
      "35-39": 0,
      "40+": 0,
      "Unknown": 0,
    };

    mothers.forEach((mother) => {
      if (!mother.age) {
        ageGroups["Unknown"]++;
      } else if (mother.age < 18) {
        ageGroups["Under 18"]++;
      } else if (mother.age < 25) {
        ageGroups["18-24"]++;
      } else if (mother.age < 35) {
        ageGroups["25-34"]++;
      } else if (mother.age < 40) {
        ageGroups["35-39"]++;
      } else {
        ageGroups["40+"]++;
      }
    });

    // Condition Analysis
    const conditionCounts: Record<string, number> = {};
    mothers.forEach((mother) => {
      if (mother.conditions) {
        const conditions = mother.conditions.toLowerCase();
        if (conditions.includes("diabetes")) conditionCounts["Diabetes"] = (conditionCounts["Diabetes"] || 0) + 1;
        if (conditions.includes("hypertension")) conditionCounts["Hypertension"] = (conditionCounts["Hypertension"] || 0) + 1;
        if (conditions.includes("anemia")) conditionCounts["Anemia"] = (conditionCounts["Anemia"] || 0) + 1;
        if (conditions.includes("preeclampsia")) conditionCounts["Preeclampsia"] = (conditionCounts["Preeclampsia"] || 0) + 1;
      }
    });

    // Engagement Metrics
    const totalChatSessions = await Promise.all(
      mothers.map(async (m) => {
        try {
          const history = await getChatHistory(m.id);
          return history?.messages && history.messages.length > 1 ? 1 : 0;
        } catch {
          return 0;
        }
      })
    );
    const activeChatUsers = totalChatSessions.reduce((a: number, b: number) => a + b, 0);

    // Question Response Time (if answered)
    const answeredQuestions = questions.filter((q) => q.answer && q.answeredAt && q.createdAt);
    const responseTimes = answeredQuestions.map((q) => {
      const created = new Date(q.createdAt).getTime();
      const answered = new Date(q.answeredAt!).getTime();
      return (answered - created) / (1000 * 60 * 60); // Hours
    });
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // High-Risk Mothers Needing Attention
    const highRiskMothers = mothers
      .map((m) => ({ mother: m, assessment: assessRisk(m) }))
      .filter((item) => item.assessment.overallRisk === "high")
      .sort((a, b) => b.assessment.riskScore - a.assessment.riskScore)
      .slice(0, 10)
      .map((item) => ({
        id: item.mother.id,
        name: item.mother.name || "Unknown",
        riskScore: item.assessment.riskScore,
        riskFactors: item.assessment.riskFactors.map((f) => f.factor),
      }));

    return NextResponse.json({
      analytics: {
        overview: {
          totalMothers: mothers.length,
          totalQuestions: questions.length,
          activeChatUsers,
          avgResponseTimeHours: Math.round(avgResponseTime * 10) / 10,
        },
        riskDistribution,
        averageRiskScore: riskScores.length > 0
          ? Math.round((riskScores.reduce((a, b) => a + b, 0) / riskScores.length) * 10) / 10
          : 0,
        riskFactors,
        geographicDistribution: geographicData,
        trimesterDistribution,
        ageDistribution: ageGroups,
        conditionPrevalence: conditionCounts,
        highRiskMothers,
      },
    });
  } catch (error: any) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to generate analytics" },
      { status: 500 }
    );
  }
}

