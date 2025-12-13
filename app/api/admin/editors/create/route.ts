import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { saveEditor, findEditorByEmail, listAllEditors } from "@/lib/data";
import { logActivity } from "@/lib/adminActivity";
import { hashPassword } from "@/lib/auth";

/**
 * Create a new editor (only for super admin)
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin" || user.adminType !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email, password, name } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Check if editor with this email already exists
    const existingEditor = await findEditorByEmail(email);
    if (existingEditor) {
      return NextResponse.json(
        { error: "An editor with this email already exists" },
        { status: 400 }
      );
    }

    // Generate editor ID
    const editorId = `editor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create editor profile
    const now = new Date().toISOString();
    const editor = {
      id: editorId,
      email: email.toLowerCase(),
      passwordHash,
      name: name || undefined,
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
      createdBy: user.id,
    };

    // Save editor
    await saveEditor(editor);

    // Log the action
    await logActivity(
      user,
      "create_editor",
      "editor",
      editorId,
      { 
        email: editor.email,
        name: editor.name,
        timestamp: now 
      },
      req
    );

    return NextResponse.json({ 
      success: true, 
      message: "Editor created successfully",
      editor: {
        id: editor.id,
        email: editor.email,
        name: editor.name,
        status: editor.status,
        createdAt: editor.createdAt,
      }
    });
  } catch (error: any) {
    console.error("Error creating editor:", error);
    return NextResponse.json(
      { error: "Failed to create editor" },
      { status: 500 }
    );
  }
}

