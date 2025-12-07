import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

export type AuthPayload = {
  id: string;
  role: "mother" | "doctor" | "admin";
  email: string;
  adminType?: "super_admin" | "editor"; // Only for admin role
};

function getSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    // During build time, env vars may not be available - return a dummy value
    // This will fail at runtime if actually used, which is expected
    if (process.env.NODE_ENV === "production" && !process.env.VERCEL && !process.env.NETLIFY) {
      // Only throw in production if not in a build environment
      throw new Error("Missing AUTH_JWT_SECRET");
    }
    return "dummy-secret-for-build"; // Dummy value for build time
  }
  return secret;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signAuthToken(payload: AuthPayload) {
  const secret = getSecret();
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyAuthToken(token: string): AuthPayload | null {
  try {
    const secret = getSecret();
    return jwt.verify(token, secret) as AuthPayload;
  } catch {
    return null;
  }
}

export async function getUserFromRequest(req: NextRequest): Promise<AuthPayload | null> {
  const header = req.headers.get("authorization") || "";
  const [, token] = header.split(" ");
  if (!token) return null;
  
  const payload = verifyAuthToken(token);
  if (!payload) return null;
  
  // Check if user account is paused - this will effectively log them out
  try {
    if (payload.role === "doctor") {
      const { getDoctor } = await import("./data");
      const doctor = await getDoctor(payload.id);
      if (doctor && doctor.status === "paused") {
        return null; // Invalid token - account is paused
      }
    } else if (payload.role === "mother") {
      const { getMother } = await import("./data");
      const mother = await getMother(payload.id);
      if (mother && mother.status === "paused") {
        return null; // Invalid token - account is paused
      }
    }
  } catch (err) {
    // If we can't check status, allow the request (fail open for availability)
    console.error("Error checking user status:", err);
  }
  
  return payload;
}

