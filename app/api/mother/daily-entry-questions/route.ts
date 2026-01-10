import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getMother, listDailyEntries } from "@/lib/data";
import { askMomsCare } from "@/lib/momsCareChat";

/**
 * GET: Get questions for a specific date and current progress
 * Returns: { questions: string[], currentQuestionIndex: number, completed: boolean }
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    
    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    // Get mother profile
    const mother = await getMother(user.id);
    if (!mother) {
      return NextResponse.json({ error: "Mother not found" }, { status: 404 });
    }

    // Get existing answers for this date (stored in daily entries with special format)
    const allEntries = await listDailyEntries(user.id);
    const dateEntries = allEntries.filter(e => e.date === date);
    
    // Check if there's a completed entry for this date (all questions answered)
    const completedEntry = dateEntries.find(e => e.entry.startsWith("DAILY_ENTRY_COMPLETED:"));
    if (completedEntry) {
      return NextResponse.json({
        questions: [],
        currentQuestionIndex: 0,
        completed: true,
        message: "All questions answered for this date"
      });
    }

    // Find answers stored in single file format: DAILY_ENTRY_ANSWERS:{"0":"answer1","1":"answer2",...}
    const answers: string[] = [];
    const answersEntry = dateEntries.find(e => e.entry.startsWith("DAILY_ENTRY_ANSWERS:"));
    if (answersEntry) {
      try {
        const jsonStr = answersEntry.entry.replace("DAILY_ENTRY_ANSWERS:", "");
        const answersObj = JSON.parse(jsonStr);
        Object.keys(answersObj).forEach(key => {
          const index = parseInt(key);
          if (!isNaN(index)) {
            answers[index] = answersObj[key];
          }
        });
      } catch (err) {
        console.error("Error parsing daily entry answers:", err);
        // Fallback: try old format for backward compatibility
        dateEntries.forEach(entry => {
          const match = entry.entry.match(/^DAILY_ENTRY_ANSWER_(\d+):(.+)$/);
          if (match) {
            const index = parseInt(match[1]);
            answers[index] = match[2];
          }
        });
      }
    } else {
      // Fallback: try old format for backward compatibility
      dateEntries.forEach(entry => {
        const match = entry.entry.match(/^DAILY_ENTRY_ANSWER_(\d+):(.+)$/);
        if (match) {
          const index = parseInt(match[1]);
          answers[index] = match[2];
        }
      });
    }
    
    const currentQuestionIndex = answers.length;

    // If all 5-6 questions are answered, mark as completed
    if (currentQuestionIndex >= 5) {
      // Save completion marker
      const { saveDailyEntry } = await import("@/lib/data");
      const { v4: uuid } = await import("uuid");
      await saveDailyEntry({
        id: uuid(),
        motherId: user.id,
        date,
        entry: "DAILY_ENTRY_COMPLETED:true",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      return NextResponse.json({
        questions: [],
        currentQuestionIndex: 0,
        completed: true,
        message: "All questions answered for this date"
      });
    }

    // Generate questions using AI (5-6 questions total)
    const totalQuestions = 6;
    const questionsToGenerate = totalQuestions - currentQuestionIndex;

    if (questionsToGenerate <= 0) {
      return NextResponse.json({
        questions: [],
        currentQuestionIndex: currentQuestionIndex,
        completed: true
      });
    }

    // Build context for AI
    const daysPregnant = mother.daysPregnant || (mother.weeksPregnant ? mother.weeksPregnant * 7 : undefined);
    const weeksPregnant = daysPregnant ? Math.floor(daysPregnant / 7) : mother.weeksPregnant;
    const trimester = daysPregnant ? Math.floor(daysPregnant / 90) + 1 : (weeksPregnant ? Math.floor(weeksPregnant / 13) + 1 : undefined);

    // Get recent entries for context (excluding today's answers)
    const recentEntries = allEntries
      .filter(e => e.date !== date && !e.entry.startsWith("DAILY_ENTRY_"))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    const profileContext = `
Name: ${mother.name || "N/A"}
Age: ${mother.age || "N/A"}
Days Pregnant: ${daysPregnant || "N/A"} (${weeksPregnant || "N/A"} weeks${trimester ? `, Trimester ${trimester}` : ""})
Medical Conditions: ${mother.conditions || "None"}
Medications: ${mother.medications || "None"}
Allergies: ${mother.allergies || "None"}
Blood Group: ${mother.bloodGroup || "N/A"}
Previous Pregnancies: ${mother.previousPregnancies || 0}
`;

    const recentEntriesContext = recentEntries.length > 0
      ? recentEntries.map(e => `Date: ${e.date}\nEntry: ${e.entry}`).join("\n\n")
      : "No recent entries.";

    const answersContext = answers.length > 0
      ? `Already answered questions:\n${answers.map((ans, idx) => `Q${idx + 1}: ${ans}`).join("\n")}`
      : "No questions answered yet for this date.";

    // Generate questions using AI
    const prompt = `You are a medical expert specializing in pregnancy care. Based on the expectant mother's profile and today's date (${date}), generate ${questionsToGenerate} personalized questions to understand her daily health status.

CRITICAL GUIDELINES:
1. Generate exactly ${questionsToGenerate} question(s) (numbered ${currentQuestionIndex + 1} to ${currentQuestionIndex + questionsToGenerate})
2. Questions should be relevant to her pregnancy stage (${weeksPregnant || "N/A"} weeks, Trimester ${trimester || "N/A"})
3. Consider her medical conditions: ${mother.conditions || "None"}
4. Consider her medications: ${mother.medications || "None"}
5. Consider her allergies: ${mother.allergies || "None"}
6. Questions should be about TODAY's health status, symptoms, activities, food intake, mood, sleep, etc.
7. Questions should be simple, clear, and easy to answer
8. Avoid asking questions already answered: ${answersContext}
9. Questions should help track daily health patterns and detect any issues early
10. Make questions culturally appropriate and easy to understand

${profileContext}

Recent Journal Entries (for context, not today):
${recentEntriesContext}

${answersContext}

Please provide exactly ${questionsToGenerate} question(s) in the following JSON format:
{
  "questions": [
    "Question 1 text here",
    "Question 2 text here",
    ...
  ]
}

Respond ONLY with valid JSON, no additional text.`;

    const messages = [
      {
        role: "user",
        content: prompt,
      },
    ];

    const response = await askMomsCare(
      messages,
      profileContext,
      [],
      weeksPregnant,
      true, // isPersonal
      true, // isLoggedIn
      {
        motherId: user.id,
      }
    );

    // Parse JSON from response
    let questionsData: { questions: string[] };
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        questionsData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Error parsing questions JSON:", parseError);
      // Fallback questions
      questionsData = {
        questions: Array(questionsToGenerate).fill(null).map((_, idx) => 
          `How are you feeling today? (Question ${currentQuestionIndex + idx + 1})`
        )
      };
    }

    // Ensure we have the right number of questions
    const questions = questionsData.questions.slice(0, questionsToGenerate);

    return NextResponse.json({
      questions,
      currentQuestionIndex,
      completed: false,
      totalQuestions: 6
    });
  } catch (error: any) {
    console.error("Daily Entry Questions GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate questions" },
      { status: 500 }
    );
  }
}

/**
 * POST: Save an answer for a specific question index
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { date, questionIndex, answer } = body;

    if (!date || questionIndex === undefined || !answer) {
      return NextResponse.json(
        { error: "Date, questionIndex, and answer are required" },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Save all answers in ONE file per day
    const { saveDailyEntry, listDailyEntries, getDailyEntry } = await import("@/lib/data");
    const { v4: uuid } = await import("uuid");
    
    // Get existing answers for this date
    const allEntries = await listDailyEntries(user.id);
    const dateEntries = allEntries.filter(e => e.date === date);
    const answersEntry = dateEntries.find(e => e.entry.startsWith("DAILY_ENTRY_ANSWERS:"));
    
    let answers: Record<string, string> = {};
    if (answersEntry) {
      try {
        const jsonStr = answersEntry.entry.replace("DAILY_ENTRY_ANSWERS:", "");
        answers = JSON.parse(jsonStr);
      } catch (err) {
        console.error("Error parsing existing answers:", err);
      }
    }
    
    // Update the answer for this question index
    answers[questionIndex.toString()] = answer.trim();
    
    // Save all answers in one file
    if (answersEntry) {
      // Update existing entry
      await saveDailyEntry({
        ...answersEntry,
        entry: `DAILY_ENTRY_ANSWERS:${JSON.stringify(answers)}`,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Create new entry
      await saveDailyEntry({
        id: uuid(),
        motherId: user.id,
        date,
        entry: `DAILY_ENTRY_ANSWERS:${JSON.stringify(answers)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Check if this was the last question (index 5, meaning 6 questions total)
    if (questionIndex >= 5) {
      // Mark as completed
      await saveDailyEntry({
        id: uuid(),
        motherId: user.id,
        date,
        entry: "DAILY_ENTRY_COMPLETED:true",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Daily Entry Questions POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save answer" },
      { status: 500 }
    );
  }
}

