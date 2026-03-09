import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLoginCode, verifyPassword, cleanupExpiredAuthRecords } from "@/lib/custom-auth";
import { sendLoginCodeEmail } from "@/lib/email";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    // TODO: Cleanup expired records when AuthSession table is properly set up
    // await cleanupExpiredAuthRecords();

    const user = await prisma.user.findUnique({ where: { email } });
    const invite = await prisma.invite.findUnique({ where: { email } });
    const allowBootstrap =
      process.env.ALLOW_FIRST_USER_BOOTSTRAP === "true" || process.env.NODE_ENV !== "production";

    if (!user && !invite) {
      const userCount = await prisma.user.count();
      if (!(allowBootstrap && userCount === 0)) {
        return NextResponse.json({ error: "Email is not allowed" }, { status: 403 });
      }
    }

    if (user?.passwordHash) {
      if (!password) {
        return NextResponse.json({ error: "Password is required for this account" }, { status: 400 });
      }
      const passwordOk = verifyPassword(password, user.passwordHash);
      if (!passwordOk) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
    }

    const code = await createLoginCode(email);
    const sent = await sendLoginCodeEmail(email, code);

    if (!sent.success) {
      return NextResponse.json(
        { error: "Failed to send verification code", details: sent.error },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("request-code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
