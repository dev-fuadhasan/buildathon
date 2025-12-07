import { NextRequest } from "next/server";
import { logAdminActivity, AdminActivity } from "./data";
import { v4 as uuidv4 } from "uuid";
import { AuthPayload } from "./auth";
import { getClientIP as getIP } from "./timezoneDetector";

/**
 * Log admin activity
 */
export async function logActivity(
  admin: AuthPayload,
  action: string,
  targetType: AdminActivity["targetType"],
  targetId: string,
  details: Record<string, any> = {},
  req?: NextRequest
): Promise<void> {
  if (admin.role !== "admin") {
    return; // Only log admin activities
  }

  try {
    const activity: AdminActivity = {
      id: uuidv4(),
      adminId: admin.id,
      adminEmail: admin.email,
      adminType: admin.adminType || "editor", // Default to editor if not set
      action,
      targetType,
      targetId,
      details,
      timestamp: new Date().toISOString(),
      ipAddress: req ? (getIP(req) || undefined) : undefined,
    };

    await logAdminActivity(activity);
  } catch (err) {
    console.error("Failed to log admin activity:", err);
    // Don't throw - logging failures shouldn't break the main operation
  }
}

