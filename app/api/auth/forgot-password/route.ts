import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetCode } from "@/lib/custom-auth";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // For security, don't reveal if email exists
      return NextResponse.json(
        { ok: true, message: "If an account exists with this email, a reset code has been sent" },
        { status: 200 }
      );
    }

    // Generate reset code
    const code = await createPasswordResetCode(user.id);

    // Send email
    const emailResult = await sendPasswordResetEmail(user.email || "", code);

    if (!emailResult.success) {
      console.error("Failed to send password reset email:", emailResult.error);
      return NextResponse.json(
        { ok: false, error: "Failed to send email. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { ok: true, message: "Password reset code sent to your email" },
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
