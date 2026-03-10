import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hashPassword } from "@/lib/custom-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "You must be signed in to reset your password" },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(password) },
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
