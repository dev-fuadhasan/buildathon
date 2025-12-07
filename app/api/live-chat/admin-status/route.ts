import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

// Simple check: if admin is logged in and has active session, they're online
// In a real app, you'd track this more accurately with WebSockets or polling
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    // For now, consider admin online if they have a valid token
    // In production, you'd want to track actual activity
    const online = user && user.role === "admin";
    
    return NextResponse.json({ online });
  } catch (error: any) {
    return NextResponse.json({ online: false });
  }
}

