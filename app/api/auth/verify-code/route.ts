import { NextRequest, NextResponse } from "next/server";
import { createUserSession, setSessionCookie } from "@/lib/custom-auth";
import { getSupabaseServer } from "@/lib/supabase-server";
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

    const supabase = getSupabaseServer();
    const { error: otpError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (otpError) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
    }

    const [existingUser, invite] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.invite.findFirst({ where: { email } }),
    ]);

    if (!existingUser && !invite) {
      return NextResponse.json(
        { error: "Access denied. Contact your administrator to request access." },
        { status: 403 }
      );
    }

    // Auto-create in our DB on first login; use invite name if available.
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: invite?.name || email.split("@")[0],
      },
    });

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
