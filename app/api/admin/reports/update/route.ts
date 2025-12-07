import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getQuestion, saveQuestion, listAdminActivities } from "@/lib/data";
import { saveNotification, Notification } from "@/lib/data";
import { logActivity } from "@/lib/adminActivity";
import { v4 as uuid } from "uuid";

/**
 * Update report status and send notification to mother
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { reportId, status, decision } = await req.json();
    
    if (!reportId || !status || !["pending", "solved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "reportId and valid status are required" },
        { status: 400 }
      );
    }

    const question = await getQuestion(reportId);
    if (!question || !question.reported) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check if this report was last modified by super admin (editors can't change super admin decisions)
    if (user.adminType === "editor") {
      const activities = await listAdminActivities(undefined, 100);
      const lastReportActivity = activities
        .filter(a => a.targetType === "report" && a.targetId === reportId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      
      // If last action was by super admin, editors cannot modify
      if (lastReportActivity && lastReportActivity.adminType === "super_admin") {
        return NextResponse.json({ 
          error: "This action was performed by super admin and cannot be modified by editors" 
        }, { status: 403 });
      }
    }

    // Update question with report status and admin decision
    const previousStatus = question.reportStatus;
    const updated = {
      ...question,
      reportStatus: status as "pending" | "solved" | "rejected",
      adminDecision: decision || question.adminDecision,
      adminDecisionAt: new Date().toISOString(),
    };

    await saveQuestion(updated);
    
    // Log activity
    await logActivity(
      user,
      `update_report_${status}`,
      "report",
      reportId,
      { 
        previousStatus, 
        newStatus: status,
        decision: decision || undefined,
        questionId: reportId 
      },
      req
    );

    // Send notification to mother if decision is provided
    if (decision && question.motherId) {
      const notification: Notification = {
        id: uuid(),
        motherId: question.motherId,
        date: new Date().toISOString().split("T")[0],
        time: new Date().getHours() < 12 ? "morning" : "night",
        content: decision,
        type: "report_decision",
        title: `Report Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        read: false,
        createdAt: new Date().toISOString(),
      };

      await saveNotification(notification);
    }

    return NextResponse.json({ success: true, question: updated });
  } catch (error: any) {
    console.error("Error updating report:", error);
    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 }
    );
  }
}

