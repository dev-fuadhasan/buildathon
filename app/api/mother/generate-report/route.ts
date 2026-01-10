import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import {
  getMother,
  listDailyEntries,
  listFoodRecommendations,
  getNotifications,
  listMotherQuestions,
  getChatHistory,
} from "@/lib/data";
import { listObjects, signedUrl } from "@/lib/r2Client";
import {
  analyzePrescriptionsAndReports,
  analyzeQuestionsAndAnswers,
  analyzeDailyEntries,
  analyzeChatHistory,
  analyzeDailyRoutines,
} from "@/lib/reportAnalysisAI";

/**
 * POST: Generate comprehensive medical report
 * Body: { type: "overall" | "dateRange", startDate?: string, endDate?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, startDate, endDate } = body;

    if (!type || !["overall", "dateRange"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid report type. Must be 'overall' or 'dateRange'" },
        { status: 400 }
      );
    }

    if (type === "dateRange") {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: "startDate and endDate are required for dateRange type" },
          { status: 400 }
        );
      }
      if (new Date(startDate) > new Date(endDate)) {
        return NextResponse.json(
          { error: "startDate must be before endDate" },
          { status: 400 }
        );
      }
    }

    // Get mother profile
    const mother = await getMother(user.id);
    if (!mother) {
      return NextResponse.json({ error: "Mother not found" }, { status: 404 });
    }

    // Get all daily entries
    const allDailyEntries = await listDailyEntries(user.id);
    
    // Filter entries by date range if needed
    let dailyEntries = allDailyEntries;
    if (type === "dateRange" && startDate && endDate) {
      dailyEntries = allDailyEntries.filter(entry => {
        const entryDate = entry.date;
        return entryDate >= startDate && entryDate <= endDate;
      });
    }

    // Get daily routines
    const allRoutines = await listFoodRecommendations(user.id);
    let routines = allRoutines;
    if (type === "dateRange" && startDate && endDate) {
      routines = allRoutines.filter(routine => {
        return routine.date >= startDate && routine.date <= endDate;
      });
    }

    // Get notifications
    const allNotifications = await getNotifications(user.id);
    let notifications = allNotifications;
    if (type === "dateRange" && startDate && endDate) {
      notifications = allNotifications.filter(notif => {
        const notifDate = notif.createdAt.split("T")[0];
        return notifDate >= startDate && notifDate <= endDate;
      });
    }

    // Get questions and answers
    const questions = await listMotherQuestions(user.id);
    let filteredQuestions = questions;
    if (type === "dateRange" && startDate && endDate) {
      filteredQuestions = questions.filter(q => {
        const qDate = q.createdAt.split("T")[0];
        return qDate >= startDate && qDate <= endDate;
      });
    }

    // Get chat history
    const chatHistory = await getChatHistory(user.id);
    let filteredChatHistory = chatHistory?.messages || [];
    if (type === "dateRange" && startDate && endDate && chatHistory) {
      filteredChatHistory = chatHistory.messages.filter(msg => {
        const msgDate = msg.timestamp?.split("T")[0] || "";
        return msgDate >= startDate && msgDate <= endDate;
      });
    }

    // Get prescriptions
    // Filter out PDF files - use only image files for AI analysis (includes PDF-converted images)
    let prescriptions: Array<{ key: string; url: string; fileName: string }> = [];
    let prescriptionUrlsForAnalysis: string[] = [];
    try {
      const prefix = `prescriptions/${user.id}/`;
      const objects = await listObjects(prefix);
      
      // Get all prescriptions (for display)
      prescriptions = await Promise.all(
        (objects || []).map(async (obj) => ({
          key: obj.Key!,
          url: await signedUrl(obj.Key!),
          fileName: obj.Key!.split("/").pop() || "prescription",
        }))
      );
      
      // Filter to only image files for AI analysis (exclude PDFs)
      // Include both direct image uploads and PDF-converted images
      const imageObjects = (objects || []).filter(obj => {
        const key = obj.Key || "";
        // Include PNG, JPG, JPEG files (both direct uploads and PDF conversions)
        return key.endsWith('.png') || key.endsWith('.jpg') || key.endsWith('.jpeg');
      });
      
      console.log(`[Report Generation] Found ${imageObjects.length} image file(s) for analysis (out of ${objects.length} total files)`);
      
      prescriptionUrlsForAnalysis = await Promise.all(
        imageObjects.map(async (obj) => {
          const url = await signedUrl(obj.Key!);
          console.log(`[Report Generation] Added image for analysis: ${obj.Key}`);
          return url;
        })
      );
      
      if (prescriptionUrlsForAnalysis.length === 0) {
        console.warn(`[Report Generation] ⚠️ No image files found for prescription analysis. PDFs may not have been converted to images.`);
      } else {
        console.log(`[Report Generation] ✅ ${prescriptionUrlsForAnalysis.length} image URL(s) ready for AI analysis`);
      }
    } catch (err) {
      console.error("Error fetching prescriptions:", err);
    }

    // Calculate pregnancy info (simplified - only show date or month)
    const daysPregnant = mother.daysPregnant || (mother.weeksPregnant ? mother.weeksPregnant * 7 : undefined);
    const weeksPregnant = daysPregnant ? Math.floor(daysPregnant / 7) : mother.weeksPregnant;
    const monthsPregnant = daysPregnant ? Math.floor(daysPregnant / 30) : undefined;

    // Generate AI analyses (run in parallel for efficiency)
    // Use filtered image URLs (PDFs excluded) for AI analysis
    const [prescriptionAnalysis, qaAnalysis, entriesAnalysis, chatAnalysis, routinesAnalysis] = await Promise.all([
      analyzePrescriptionsAndReports(mother, prescriptionUrlsForAnalysis),
      analyzeQuestionsAndAnswers(mother, filteredQuestions.map(q => ({
        question: q.question,
        answer: q.answer,
        createdAt: q.createdAt,
      }))),
      analyzeDailyEntries(mother, dailyEntries),
      analyzeChatHistory(mother, filteredChatHistory),
      analyzeDailyRoutines(mother, routines),
    ]);

    // Build comprehensive report data with AI-generated analyses
    const reportData = {
      generatedAt: new Date().toISOString(),
      reportType: type,
      dateRange: type === "dateRange" ? { startDate, endDate } : null,
      
      // Patient Information
      patientInfo: {
        name: mother.name || "N/A",
        age: mother.age || "N/A",
        email: mother.email,
        phone: mother.phone || "N/A",
        address: mother.address || "N/A",
        bloodGroup: mother.bloodGroup || "N/A",
        emergencyContact: mother.emergencyContact || "N/A",
        emergencyPhone: mother.emergencyPhone || "N/A",
      },

      // Pregnancy Information (simplified)
      pregnancyInfo: {
        weeksPregnant: weeksPregnant || "N/A",
        monthsPregnant: monthsPregnant || "N/A",
        dueDate: mother.dueDate || "N/A",
        previousPregnancies: mother.previousPregnancies || 0,
      },

      // Medical Information
      medicalInfo: {
        conditions: mother.conditions || "None",
        medications: mother.medications || "None",
        allergies: mother.allergies || "None",
      },

      // AI-Generated Professional Analyses
      analyses: {
        prescriptionsAndReports: prescriptionAnalysis,
        questionsAndAnswers: qaAnalysis,
        dailyEntries: entriesAnalysis,
        chatHistory: chatAnalysis,
        dailyRoutines: routinesAnalysis,
      },

      // Prescriptions (for reference)
      prescriptions: prescriptions.map(p => ({
        fileName: p.fileName,
        url: p.url,
      })),

      // Statistics (for reference)
      statistics: {
        totalDailyEntries: dailyEntries.length,
        totalRoutines: routines.length,
        completedMeals: routines.reduce((sum, r) => {
          return sum + [r.breakfastEaten, r.lunchEaten, r.dinnerEaten].filter(Boolean).length;
        }, 0),
        completedExercises: routines.filter(r => r.exercisesDone).length,
        totalQuestions: filteredQuestions.length,
        answeredQuestions: filteredQuestions.filter(q => q.answer).length,
        totalPrescriptions: prescriptions.length,
      },
    };

    return NextResponse.json({ success: true, report: reportData });
  } catch (error: any) {
    console.error("Generate report error:", error);
    return NextResponse.json(
      { error: "Failed to generate report", message: error.message },
      { status: 500 }
    );
  }
}

