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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
