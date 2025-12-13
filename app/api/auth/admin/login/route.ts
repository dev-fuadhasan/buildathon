import { NextRequest, NextResponse } from "next/server";
import { signAuthToken, verifyPassword } from "@/lib/auth";
import { logActivity } from "@/lib/adminActivity";
import { findEditorByEmail, listAdminActivities } from "@/lib/data";

// Super Admin credentials
const SUPER_ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@admin.com";
const SUPER_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin@password";

// Legacy Editor credentials (for backward compatibility)
const EDITOR_1_EMAIL = process.env.EDITOR_1_EMAIL || "access@fahim.com";
const EDITOR_1_PASSWORD = process.env.EDITOR_1_PASSWORD || "fahim##02";
const EDITOR_2_EMAIL = process.env.EDITOR_2_EMAIL || "access@saikat.com";
const EDITOR_2_PASSWORD = process.env.EDITOR_2_PASSWORD || "saikat##03";

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
  // Check legacy editor 1 (for backward compatibility)
  else if (emailLower === EDITOR_1_EMAIL.toLowerCase()) {
    // Direct password comparison (passwords stored in env as plain text for simplicity)
    if (password !== EDITOR_1_PASSWORD) {
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
    }
    
    // Check if editor is paused
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
  // Check legacy editor 2 (for backward compatibility)
  else if (emailLower === EDITOR_2_EMAIL.toLowerCase()) {
    // Direct password comparison (passwords stored in env as plain text for simplicity)
    if (password !== EDITOR_2_PASSWORD) {
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
    }
    
    // Check if editor is paused
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
  // Check stored editors (dynamically created)
  else {
    const storedEditor = await findEditorByEmail(emailLower);
    if (storedEditor) {
      // Verify password
      const validPassword = await verifyPassword(password, storedEditor.passwordHash);
      if (!validPassword) {
        return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
      }
      
      // Check if editor is paused or deleted
      if (storedEditor.status === "paused") {
        return NextResponse.json({ error: "This editor account has been paused by super admin" }, { status: 403 });
      }
      if (storedEditor.status === "deleted") {
        return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
      }
      
      adminId = storedEditor.id;
      adminEmail = storedEditor.email;
      adminType = "editor";
    } else {
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
    }
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

