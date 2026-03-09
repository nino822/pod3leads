import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePasswordResetCode, hashPassword } from "@/lib/custom-auth";
import { getSessionFromRequest } from "@/lib/custom-auth";

export async function POST(request: NextRequest) {
  try {
    const { code, password } = await request.json();

    // Get user from session
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "You must be signed in to reset your password" },
        { status: 401 }
      );
    }

    if (!code || typeof code !== "string") {
      return NextResponse.json({ ok: false, error: "Reset code is required" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate reset code
    const validation = await validatePasswordResetCode(user.id, code.trim());
    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, error: validation.reason },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = hashPassword(password);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json(
      { ok: true, message: "Password updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { ok: false, error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
