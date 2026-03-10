import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetCode } from "@/lib/custom-auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Always return success for security (don't reveal if email exists)
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (user) {
      const code = await createPasswordResetCode(user.id);
      await sendPasswordResetEmail(normalizedEmail, code);
    }

    return NextResponse.json(
      { ok: true, message: "If an account exists with this email, a reset code has been sent" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { ok: false, error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
