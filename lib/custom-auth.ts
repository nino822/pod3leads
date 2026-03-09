import { randomBytes, createHash, createHmac, timingSafeEqual, scryptSync } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "pod3_session";
const SESSION_DAYS = 7;
const CODE_TTL_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
}

function getSessionSecret() {
  return process.env.AUTH_SESSION_SECRET || process.env.NEXTAUTH_SECRET || "dev-session-secret";
}

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function hashCode(email: string, code: string) {
  const secret = getSessionSecret();
  return createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
}

function verifyCodeHash(email: string, code: string, storedHash: string) {
  const computed = hashCode(email, code);
  const stored = Buffer.from(storedHash);
  const current = Buffer.from(computed);
  if (stored.length !== current.length) {
    return false;
  }
  return timingSafeEqual(stored, current);
}

export function generateLoginCode() {
  const value = Math.floor(100000 + Math.random() * 900000);
  return String(value);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${key}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedKey] = passwordHash.split(":");
  if (!salt || !storedKey) return false;
  const currentKey = scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(storedKey);
  const b = Buffer.from(currentKey);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createLoginCode(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const code = generateLoginCode();
  const codeHash = hashCode(normalizedEmail, code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await prisma.loginCode.deleteMany({ where: { email: normalizedEmail } });
  await prisma.loginCode.create({
    data: {
      email: normalizedEmail,
      codeHash,
      expiresAt,
    },
  });

  return code;
}

export async function validateLoginCode(email: string, code: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const loginCode = await prisma.loginCode.findFirst({
    where: {
      email: normalizedEmail,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!loginCode) {
    return { ok: false as const, reason: "Code expired or not found" };
  }

  if (loginCode.attempts >= MAX_CODE_ATTEMPTS) {
    await prisma.loginCode.delete({ where: { id: loginCode.id } });
    return { ok: false as const, reason: "Too many attempts" };
  }

  const valid = verifyCodeHash(normalizedEmail, code.trim(), loginCode.codeHash);
  if (!valid) {
    await prisma.loginCode.update({
      where: { id: loginCode.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false as const, reason: "Invalid code" };
  }

  await prisma.loginCode.deleteMany({ where: { email: normalizedEmail } });
  return { ok: true as const };
}

export async function createUserSession(userId: string) {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = sha256(rawToken + getSessionSecret());
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
}

function hashSessionToken(rawToken: string) {
  return sha256(rawToken + getSessionSecret());
}

export function setSessionCookie(response: NextResponse, rawToken: string, expiresAt: Date) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: rawToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getSessionFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const authSession = await prisma.authSession.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!authSession || !authSession.user.email) {
    return null;
  }

  return {
    id: authSession.user.id,
    email: authSession.user.email,
    name: authSession.user.name,
    displayName: authSession.user.displayName,
  };
}

export async function deleteSessionFromRequest(request: NextRequest) {
  const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return;
  const tokenHash = hashSessionToken(rawToken);
  await prisma.authSession.deleteMany({ where: { tokenHash } });
}

export async function cleanupExpiredAuthRecords() {
  const now = new Date();
  await prisma.authSession.deleteMany({ where: { expiresAt: { lt: now } } });
  await prisma.loginCode.deleteMany({ where: { expiresAt: { lt: now } } });
}
