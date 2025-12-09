/**
 * Session helper for guest users
 * Generates unique session ID based on IP + User-Agent
 */

import { NextRequest } from "next/server";
import crypto from "crypto";

/**
 * Generate a unique session ID for guest users
 * Based on: IP address, User-Agent, and a daily salt
 * This ensures same user gets same session within a day
 */
export function generateGuestSessionId(req: NextRequest): string {
  // Get IP address
  const ip = 
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown";
  
  // Get User-Agent
  const userAgent = req.headers.get("user-agent") || "unknown";
  
  // Get date (changes daily to refresh sessions)
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  
  // Create hash
  const hash = crypto
    .createHash("sha256")
    .update(`${ip}-${userAgent}-${date}`)
    .digest("hex");
  
  // Return first 32 characters
  return `guest_${hash.substring(0, 32)}`;
}

/**
 * Check if two requests are from the same guest session
 */
export function isSameGuestSession(req1SessionId: string, req2SessionId: string): boolean {
  return req1SessionId === req2SessionId;
}

