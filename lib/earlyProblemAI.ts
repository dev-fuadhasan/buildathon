/**
 * AI-based Early Problem Detection for Daily Health Questions
 * Analyzes answers and generates personalized alerts and recommendations
 */

import { MotherProfile } from "./data";

export interface AnswerDetail {
  question: string;
  answer: "yes" | "no";
  category?: string;
}

export interface EarlyProblemAnalysis {
  alerts: string[];
  recommendation: string;
}

/**
 * Generate AI analysis of daily question answers
 */
export async function generateEarlyProblemAnalysis(
  answers: AnswerDetail[],
  mother?: MotherProfile
): Promise<EarlyProblemAnalysis> {
  const yesAnswers = answers.filter(a => a.answer === "yes");
  
  // If no "yes" answers, no concerns
  if (yesAnswers.length === 0) {
    return {
      alerts: [],
      recommendation: "Great! No concerns detected from today's health questions. Continue monitoring your health and maintain regular checkups.",
    };
  }

  // Build context for AI
  const context = buildAnalysisContext(answers, yesAnswers, mother);
  
  // Use AI to analyze (similar to chat AI)
  const analysis = await analyzeWithAI(context);
  
  return analysis;
}

/**
 * Build context for AI analysis
 */
function buildAnalysisContext(
  allAnswers: AnswerDetail[],
  yesAnswers: AnswerDetail[],
  mother?: MotherProfile
): string {
  let context = "Analyze the following health questionnaire answers from a pregnant mother:\n\n";
  
  if (mother) {
    context += `Mother Profile:\n`;
    if (mother.weeksPregnant) context += `- Weeks Pregnant: ${mother.weeksPregnant}\n`;
    if (mother.daysPregnant) context += `- Days Pregnant: ${mother.daysPregnant}\n`;
    if (mother.bloodGroup) context += `- Blood Group: ${mother.bloodGroup}\n`;
    if (mother.conditions) context += `- Existing Conditions: ${mother.conditions}\n`;
    context += `\n`;
  }
  
  context += `Total Questions Answered: ${allAnswers.length}\n`;
  context += `Concerns Identified (Yes answers): ${yesAnswers.length}\n\n`;
  
  context += `Questions with "Yes" answers:\n`;
  yesAnswers.forEach((a, idx) => {
    context += `${idx + 1}. ${a.question} (Category: ${a.category || "General"})\n`;
  });
  
  context += `\nPlease provide:\n`;
  context += `1. Specific health alerts (if any) - one line each, be specific about the concern\n`;
  context += `2. One concise recommendation (1-2 sentences) on what the mother should do\n`;
  context += `3. If no serious concerns, provide reassurance and general advice\n`;
  context += `4. Be professional, empathetic, and actionable\n`;
  
  return context;
}

/**
 * Analyze with AI (using Groq like chat AI)
 */
async function analyzeWithAI(context: string): Promise<EarlyProblemAnalysis> {
  try {
    // Use Groq API like the chat system
    const { groq, isGroqConfigured } = await import("./groqClient");
    
    if (!isGroqConfigured()) {
      console.warn("Groq not configured, using fallback analysis");
      return fallbackAnalysis(context);
    }

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a healthcare AI assistant specializing in maternal health. Analyze daily health questionnaire answers and provide:
1. Specific health alerts (if any concerns) - one line each, be clear and specific
2. One concise recommendation (1-2 sentences) - actionable advice
3. If no serious concerns, provide reassurance

Format your response as JSON:
{
  "alerts": ["alert1", "alert2"] or [],
  "recommendation": "one concise recommendation"
}

Be professional, empathetic, and medically appropriate. Only flag genuine concerns.`,
        },
        {
          role: "user",
          content: context,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || "";
    
    // Try to parse JSON response
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
          recommendation: parsed.recommendation || "Continue monitoring your health and consult your healthcare provider if you have any concerns.",
        };
      }
    } catch {
      // If not JSON, parse text response
      return parseTextResponse(content);
    }
    
    return parseTextResponse(content);
  } catch (error) {
    console.error("Error in AI analysis:", error);
    // Fallback to rule-based analysis
    return fallbackAnalysis(context);
  }
}

/**
 * Parse text response if JSON parsing fails
 */
function parseTextResponse(text: string): EarlyProblemAnalysis {
  const lines = text.split("\n").filter(l => l.trim());
  const alerts: string[] = [];
  let recommendation = "";
  
  let inAlerts = false;
  let inRecommendation = false;
  
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("alert") || lower.includes("concern") || lower.includes("warning")) {
      inAlerts = true;
      inRecommendation = false;
    } else if (lower.includes("recommendation") || lower.includes("advice") || lower.includes("suggest")) {
      inRecommendation = true;
      inAlerts = false;
    }
    
    if (inAlerts && line.trim() && !line.toLowerCase().includes("alert")) {
      alerts.push(line.trim().replace(/^[-•*]\s*/, ""));
    } else if (inRecommendation && line.trim() && !line.toLowerCase().includes("recommendation")) {
      recommendation += line.trim() + " ";
    }
  }
  
  return {
    alerts: alerts.filter(a => a.length > 0),
    recommendation: recommendation.trim() || "Continue monitoring your health and consult your healthcare provider if you have any concerns.",
  };
}

/**
 * Fallback rule-based analysis if AI fails
 */
function fallbackAnalysis(context: string): EarlyProblemAnalysis {
  // Simple rule-based analysis
  const yesCount = (context.match(/Yes answers: (\d+)/)?.[1] || "0");
  const totalCount = (context.match(/Total Questions Answered: (\d+)/)?.[1] || "10");
  const yesNum = parseInt(yesCount);
  const totalNum = parseInt(totalCount);
  
  if (yesNum === 0) {
    return {
      alerts: [],
      recommendation: "Great! No concerns detected from today's health questions. Continue monitoring your health and maintain regular checkups.",
    };
  }
  
  const percentage = (yesNum / totalNum) * 100;
  
  if (percentage > 30) {
    return {
      alerts: ["Multiple health concerns detected from today's questionnaire"],
      recommendation: "Please consult with your healthcare provider as soon as possible to discuss the concerns identified in today's health check.",
    };
  } else if (percentage > 20) {
    return {
      alerts: ["Some health concerns detected"],
      recommendation: "Monitor your symptoms closely and consider consulting your healthcare provider if symptoms persist or worsen.",
    };
  } else {
    return {
      alerts: [],
      recommendation: "Minor concerns noted. Continue monitoring your health and maintain regular checkups. Contact your healthcare provider if you have any specific worries.",
    };
  }
}

