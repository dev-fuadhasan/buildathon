import { NextRequest, NextResponse } from "next/server";
import { signAuthToken } from "@/lib/auth";
import { logActivity } from "@/lib/adminActivity";

// Super Admin credentials
const SUPER_ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@admin.com";
const SUPER_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin@password";

// Editor credentials
const EDITOR_1_EMAIL = process.env.EDITOR_1_EMAIL || "access@fahim.com";
const EDITOR_1_PASSWORD = process.env.EDITOR_1_PASSWORD || "fahim##02";
const EDITOR_2_EMAIL = process.env.EDITOR_2_EMAIL || "access@saikat.com";
const EDITOR_2_PASSWORD = process.env.EDITOR_2_PASSWORD || "saikat##03";

// Helper to compare password with stored hash
async function comparePassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}

// Helper to hash password (for initial setup)
async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 10);
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const emailLower = email.toLowerCase();
  let adminId: string;
  let adminEmail: string;
  let adminType: "super_admin" | "editor";

  // Check super admin
  if (emailLower === SUPER_ADMIN_EMAIL.toLowerCase()) {
    // Direct password comparison (passwords stored in env as plain text for simplicity)
    if (password !== SUPER_ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
    }
    adminId = "super_admin";
    adminEmail = SUPER_ADMIN_EMAIL;
    adminType = "super_admin";
  }
  // Check editor 1
  else if (emailLower === EDITOR_1_EMAIL.toLowerCase()) {
    // Direct password comparison (passwords stored in env as plain text for simplicity)
    if (password !== EDITOR_1_PASSWORD) {
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
    }
    
    // Check if editor is paused
    const { listAdminActivities } = await import("@/lib/data");
    const activities = await listAdminActivities("editor_1", 100);
    const pauseActivity = activities.find(a => a.action === "pause_editor");
    if (pauseActivity) {
      const unpauseActivity = activities.find(a => 
        a.action === "unpause_editor" && 
        new Date(a.timestamp) > new Date(pauseActivity.timestamp)
      );
      if (!unpauseActivity) {
        return NextResponse.json({ error: "This editor account has been paused by super admin" }, { status: 403 });
      }
    }
    
    adminId = "editor_1";
    adminEmail = EDITOR_1_EMAIL;
    adminType = "editor";
  }
  // Check editor 2
  else if (emailLower === EDITOR_2_EMAIL.toLowerCase()) {
    // Direct password comparison (passwords stored in env as plain text for simplicity)
    if (password !== EDITOR_2_PASSWORD) {
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
    }
    
    // Check if editor is paused
    const { listAdminActivities } = await import("@/lib/data");
    const activities = await listAdminActivities("editor_2", 100);
    const pauseActivity = activities.find(a => a.action === "pause_editor");
    if (pauseActivity) {
      const unpauseActivity = activities.find(a => 
        a.action === "unpause_editor" && 
        new Date(a.timestamp) > new Date(pauseActivity.timestamp)
      );
      if (!unpauseActivity) {
        return NextResponse.json({ error: "This editor account has been paused by super admin" }, { status: 403 });
      }
    }
    
    adminId = "editor_2";
    adminEmail = EDITOR_2_EMAIL;
    adminType = "editor";
  }
  else {
    return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
  }

  // Log login activity
  await logActivity(
    { id: adminId, email: adminEmail, role: "admin", adminType },
    "login",
    "system",
    "system",
    { loginTime: new Date().toISOString() },
    req
  );

  const token = signAuthToken({ 
    id: adminId, 
    email: adminEmail, 
    role: "admin",
    adminType 
  });
  
  return NextResponse.json({ token, adminType });
}

