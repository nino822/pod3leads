import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  validateLoginCode,
  createUserSession,
  setSessionCookie,
  cleanupExpiredAuthRecords,
} from "@/lib/custom-auth";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!email || !isValidEmail(email) || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    await cleanupExpiredAuthRecords();

    const codeResult = await validateLoginCode(email, code);
    if (!codeResult.ok) {
      return NextResponse.json({ error: codeResult.reason }, { status: 401 });
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const invite = await prisma.invite.findUnique({ where: { email } });
      const allowBootstrap =
        process.env.ALLOW_FIRST_USER_BOOTSTRAP === "true" || process.env.NODE_ENV !== "production";

      if (!invite) {
        const userCount = await prisma.user.count();
        if (!(allowBootstrap && userCount === 0)) {
          return NextResponse.json({ error: "Email is not allowed" }, { status: 403 });
        }
      }

      user = await prisma.user.create({
        data: {
          email,
          name: invite?.name || email.split("@")[0],
        },
      });

      if (invite) {
        await prisma.invite.delete({ where: { id: invite.id } });
      }
    }

    const { rawToken, expiresAt } = await createUserSession(user.id);
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        displayName: user.displayName,
      },
    });

    setSessionCookie(response, rawToken, expiresAt);
    return response;
  } catch (error) {
    console.error("verify-code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
