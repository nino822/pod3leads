import { NextRequest, NextResponse } from "next/server";
import { validateLoginCode, createUserSession, setSessionCookie } from "@/lib/custom-auth";
import { prisma } from "@/lib/prisma";

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

    const validation = await validateLoginCode(email, code);

    if (!validation.ok) {
      const msg =
        validation.reason === "Too many attempts"
          ? "Too many attempts. Please request a new code."
          : "Invalid or expired code";
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Account not found. You may need an invite to access this dashboard." },
        { status: 403 }
      );
    }

    const { rawToken, expiresAt } = await createUserSession(user.id);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email!,
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
