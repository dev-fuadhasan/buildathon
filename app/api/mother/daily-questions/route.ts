import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getMother, getDailyQuestionSession, saveDailyQuestionSession, saveDailyQuestion, listDailyQuestions, getAdminSettings } from "@/lib/data";
import { getRandomQuestions, getAllQuestions, getQuestionById } from "@/lib/questionDatasetLoader";
import { getCurrentDateInTimezone, getCurrentTimeInTimezone } from "@/lib/pregnancyTracker";
import { detectTimezoneFromIP, getClientIP } from "@/lib/timezoneDetector";
import { v4 as uuid } from "uuid";

/**
 * GET /api/mother/daily-questions
 * Get today's questions for the mother
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mother = await getMother(user.id);
    if (!mother) {
      return NextResponse.json({ error: "Mother not found" }, { status: 404 });
    }

    // Get timezone
    const ip = getClientIP(req);
    const timezone = mother.timezone || (await detectTimezoneFromIP(ip, mother.address));
    const today = getCurrentDateInTimezone(timezone);
    const { hour, minute } = getCurrentTimeInTimezone(timezone);

    // Get admin settings
    const settings = await getAdminSettings();

    // Check if daily questions are enabled
    const dailyQuestionsEnabled = settings.dailyQuestionsEnabled ?? true;
    
    if (!dailyQuestionsEnabled) {
      console.log(`[Daily Questions] Daily questions are disabled by admin settings`);
      return NextResponse.json({
        session: null,
        questions: [],
        shouldShow: false,
        enabled: false,
      });
    }

    // Check if questions should be shown today
    // Show if: it's after the configured question time (hour:minute) AND questions haven't been completed today
    const questionMinute = settings.questionMinute ?? 0;
    const currentTimeMinutes = hour * 60 + minute;
    const questionTimeMinutes = settings.questionHour * 60 + questionMinute;
    const isAfterQuestionTime = currentTimeMinutes >= questionTimeMinutes;
    const hasCompletedToday = mother.lastQuestionDate === today;
    
    // Debug logging
    console.log(`[Daily Questions] Mother: ${mother.email || mother.id}, Timezone: ${timezone}, Current Time: ${hour}:${String(minute).padStart(2, '0')}, Question Time: ${settings.questionHour}:${String(questionMinute).padStart(2, '0')}, isAfterQuestionTime: ${isAfterQuestionTime}, hasCompletedToday: ${hasCompletedToday}, lastQuestionDate: ${mother.lastQuestionDate}, today: ${today}`);
    
    // If it's not time yet, return early without creating session
    if (!isAfterQuestionTime) {
      console.log(`[Daily Questions] Not time yet - current: ${currentTimeMinutes} minutes, required: ${questionTimeMinutes} minutes`);
      return NextResponse.json({
        session: null,
        questions: [],
        shouldShow: false,
        enabled: true,
      });
    }

    // Check if there's an active session for today
    let session = await getDailyQuestionSession(mother.id, today);
    console.log(`[Daily Questions] Existing session check: ${session ? `found (completed: ${session.completed}, answered: ${session.answeredCount}/${session.totalQuestions}, questionIds: ${session.questionIds?.length || 0})` : 'none'}`);
    
    // If session exists and is completed, return it (no need to show popup)
    if (session && session.completed) {
      console.log(`[Daily Questions] Session already completed today`);
      return NextResponse.json({
        session: {
          id: session.id,
          date: session.date,
          answeredCount: session.answeredCount,
          totalQuestions: session.totalQuestions,
          completed: session.completed,
          earlyProblems: session.earlyProblems || [],
        },
        questions: [],
        shouldShow: false,
      });
    }
    
    // If there's an incomplete session with no questions, delete it and create a new one
    if (session && !session.completed && (!session.questionIds || session.questionIds.length === 0)) {
      console.log(`[Daily Questions] Found incomplete session with no questions, will recreate`);
      // Delete the invalid session by creating a new one (the old one will be overwritten)
      session = null;
    }
    
    // If there's an incomplete session with questions, we'll use it and show questions
    if (session && !session.completed && session.questionIds && session.questionIds.length > 0) {
      console.log(`[Daily Questions] Found incomplete session with ${session.questionIds.length} questions, will show questions`);
    }

    // Only create session if it's after question time AND not completed today
    if (!session && !hasCompletedToday) {
      console.log(`[Daily Questions] Creating new session for today`);
      // Create new session for today
      const allQuestions = getAllQuestions();
      console.log(`[Daily Questions] Total questions in dataset: ${allQuestions.length}`);
      
      if (allQuestions.length === 0) {
        console.error(`[Daily Questions] No questions available in dataset!`);
        return NextResponse.json({
          session: null,
          questions: [],
          shouldShow: false,
          error: "No questions available in dataset",
        });
      }
      
      const answeredIds = mother.answeredQuestionIds || [];
      
      // If all questions have been answered, reset the list
      let availableIds = allQuestions.map(q => q.id).filter(id => !answeredIds.includes(id));
      if (availableIds.length < settings.questionsPerDay) {
        // Reset - all questions have been answered
        console.log(`[Daily Questions] Resetting question list - all questions answered`);
        availableIds = allQuestions.map(q => q.id);
      }

      // Get random questions for today
      const selectedQuestions = getRandomQuestions(settings.questionsPerDay, answeredIds.length >= allQuestions.length ? [] : answeredIds);
      console.log(`[Daily Questions] Selected ${selectedQuestions.length} questions for today`);

      if (selectedQuestions.length === 0) {
        console.error(`[Daily Questions] Failed to select questions!`);
        return NextResponse.json({
          session: null,
          questions: [],
          shouldShow: false,
          error: "Failed to select questions",
        });
      }

      session = {
        id: uuid(),
        motherId: mother.id,
        date: today,
        questionIds: selectedQuestions.map(q => q.id),
        answeredCount: 0,
        totalQuestions: selectedQuestions.length,
        completed: false,
        earlyProblems: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveDailyQuestionSession(session);
      console.log(`[Daily Questions] Session created: ${session.id} with ${session.questionIds.length} questions`);
    }
    
    // If no session exists, return empty (shouldn't happen if we got here, but safety check)
    if (!session) {
      return NextResponse.json({
        session: null,
        questions: [],
        shouldShow: false,
      });
    }

    // Get question details
    const questions = session.questionIds.map(id => {
      const q = getQuestionById(id);
      return q ? {
        id: q.id,
        question_en: q.question_en,
        question_bn: q.question_bn,
        category: q.category,
      } : null;
    }).filter(Boolean);

    console.log(`[Daily Questions] Found ${questions.length} questions for session`);

    // Get already answered questions for today
    const todayAnswers = await listDailyQuestions(mother.id, today);
    const answeredMap = new Map(todayAnswers.map(a => [a.questionId, a.answer]));

    const shouldShow = !session.completed && questions.length > 0;
    console.log(`[Daily Questions] Returning: shouldShow=${shouldShow}, completed=${session.completed}, questionsCount=${questions.length}`);

    return NextResponse.json({
      session: {
        id: session.id,
        date: session.date,
        answeredCount: session.answeredCount,
        totalQuestions: session.totalQuestions,
        completed: session.completed,
        earlyProblems: session.earlyProblems || [],
      },
      questions: questions.map(q => ({
        ...q,
        answer: answeredMap.get(q!.id) || null,
      })),
      shouldShow, // Show popup if not completed and questions exist
    });
  } catch (error: any) {
    console.error("Error getting daily questions:", error);
    return NextResponse.json(
      { error: "Failed to get daily questions", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mother/daily-questions
 * Submit answer to a question
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mother = await getMother(user.id);
    if (!mother) {
      return NextResponse.json({ error: "Mother not found" }, { status: 404 });
    }

    const { questionId, answer } = await req.json();

    if (!questionId || !answer || !["yes", "no"].includes(answer)) {
      return NextResponse.json(
        { error: "questionId and answer (yes/no) are required" },
        { status: 400 }
      );
    }

    // Get timezone
    const ip = getClientIP(req);
    const timezone = mother.timezone || (await detectTimezoneFromIP(ip, mother.address));
    const today = getCurrentDateInTimezone(timezone);

    // Get or create session
    let session = await getDailyQuestionSession(mother.id, today);
    if (!session) {
      return NextResponse.json(
        { error: "No active question session for today" },
        { status: 404 }
      );
    }

    // Check if question is in today's session
    if (!session.questionIds.includes(questionId)) {
      return NextResponse.json(
        { error: "Question not in today's session" },
        { status: 400 }
      );
    }

    // Save or update answer (optimized - check existing first)
    const existingAnswer = await listDailyQuestions(mother.id, today);
    const existing = existingAnswer.find(a => a.questionId === questionId);

    const questionAnswer: any = {
      id: existing?.id || uuid(),
      motherId: mother.id,
      questionId,
      date: today,
      answer: answer as "yes" | "no",
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    // Save answer and update session in parallel for speed
    const saveAnswerPromise = saveDailyQuestion(questionAnswer);
    
    // Calculate new answered count (optimize by using existing count + 1 if new answer)
    const isNewAnswer = !existing;
    const newAnsweredCount = isNewAnswer ? existingAnswer.length + 1 : existingAnswer.length;
    const completed = newAnsweredCount >= session.totalQuestions;

    // Update session immediately (don't wait for AI analysis if not completed)
    session.answeredCount = newAnsweredCount;
    session.completed = completed;
    session.updatedAt = new Date().toISOString();

    // Only run AI analysis if all questions are completed (to save time)
    let earlyProblems: string[] = [];
    if (completed) {
      // Wait for answer to be saved first
      await saveAnswerPromise;
      const allAnswers = await listDailyQuestions(mother.id, today);
      // Run AI analysis asynchronously - don't block response
      detectEarlyProblemsAsync(mother.id, allAnswers, session.id, today).catch(err => {
        console.error("Error in async early problem detection:", err);
      });
    } else {
      // Save answer and session in parallel
      await Promise.all([
        saveAnswerPromise,
        saveDailyQuestionSession(session)
      ]);
    }

    // Update mother's answered question IDs (can be async, don't block)
    const answeredIds = new Set(mother.answeredQuestionIds || []);
    answeredIds.add(questionId);
    
    const { saveMother } = await import("@/lib/data");
    saveMother({
      ...mother,
      answeredQuestionIds: Array.from(answeredIds),
      lastQuestionDate: today,
      updatedAt: new Date().toISOString(),
    }).catch(err => console.error("Error updating mother profile:", err));

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        date: session.date,
        answeredCount: session.answeredCount,
        totalQuestions: session.totalQuestions,
        completed: session.completed,
        earlyProblems: session.earlyProblems || [],
      },
    });
  } catch (error: any) {
    console.error("Error submitting answer:", error);
    return NextResponse.json(
      { error: "Failed to submit answer", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Detect early problems using AI analysis (async, doesn't block response)
 */
async function detectEarlyProblemsAsync(
  motherId: string,
  answers: Array<{ questionId: string; answer: "yes" | "no" }>,
  sessionId: string,
  date: string
): Promise<void> {
  try {
    const { getQuestionById } = await import("@/lib/questionDatasetLoader");
    const { getMother } = await import("@/lib/data");
    const { generateEarlyProblemAnalysis } = await import("@/lib/earlyProblemAI");
    
    // Get question details for context
    const answerDetails = answers.map(a => {
      const q = getQuestionById(a.questionId);
      return {
        question: q?.question_en || "",
        answer: a.answer,
        category: q?.category || "",
      };
    });

    // Get mother profile for context
    const mother = await getMother(motherId);
    
    // Use AI to analyze answers and generate alerts/recommendations
    const analysis = await generateEarlyProblemAnalysis(answerDetails, mother || undefined);
    
    // Update session with AI-generated alerts
    const { getDailyQuestionSession, saveDailyQuestionSession } = await import("@/lib/data");
    const session = await getDailyQuestionSession(motherId, date);
    if (session && session.id === sessionId) {
      session.earlyProblems = analysis.alerts;
      session.earlyProblemRecommendation = analysis.recommendation;
      session.updatedAt = new Date().toISOString();
      await saveDailyQuestionSession(session);
    }
  } catch (error) {
    console.error("Error in AI early problem detection:", error);
    // Fallback to simple detection if AI fails
    const simpleProblems = detectEarlyProblemsSimple(answers);
    const { getDailyQuestionSession, saveDailyQuestionSession } = await import("@/lib/data");
    const session = await getDailyQuestionSession(motherId, date);
    if (session && session.id === sessionId) {
      session.earlyProblems = simpleProblems;
      session.updatedAt = new Date().toISOString();
      await saveDailyQuestionSession(session);
    }
  }
}

/**
 * Simple fallback detection (used if AI fails)
 */
function detectEarlyProblemsSimple(answers: Array<{ questionId: string; answer: "yes" | "no" }>): string[] {
  const yesAnswers = answers.filter(a => a.answer === "yes");
  
  if (yesAnswers.length === 0) {
    return [];
  }
  
  if (yesAnswers.length > answers.length * 0.3) {
    return ["Multiple concerns detected - please consult with your healthcare provider"];
  }
  
  return [];
}

