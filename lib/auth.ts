import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

export type AuthPayload = {
  id: string;
  role: "mother" | "doctor" | "admin";
  email: string;
};

const secret = process.env.AUTH_JWT_SECRET;

if (!secret) {
  throw new Error("Missing AUTH_JWT_SECRET");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signAuthToken(payload: AuthPayload) {
  return jwt.sign(payload, secret!, { expiresIn: "7d" });
}

export function verifyAuthToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, secret!) as AuthPayload;
  } catch {
    return null;
  }
}

export function getUserFromRequest(req: NextRequest): AuthPayload | null {
  const header = req.headers.get("authorization") || "";
  const [, token] = header.split(" ");
  if (!token) return null;
  return verifyAuthToken(token);
}

