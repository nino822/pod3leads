import { NextRequest, NextResponse } from "next/server";
import { createUserSession, setSessionCookie, verifyPassword } from "@/lib/custom-auth";
import { prisma } from "@/lib/prisma";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !isValidEmail(email) || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.email && !user.passwordHash) {
      return NextResponse.json(
        { error: "No password is set for this account yet. Ask an admin to assign a temporary password or use OTP." },
        { status: 400 }
      );
    }

    if (!user || !user.email || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
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
    console.error("password login error:", error);
    const message = error instanceof Error ? error.message : String(error);
    const details =
      message.includes("column") || message.includes("role")
        ? "Database schema is out of sync. Run `npx prisma db push` for the latest role/password changes, then try again."
        : message;
    return NextResponse.json(
      { error: "Internal server error", details },
      { status: 500 }
    );
  }
}
