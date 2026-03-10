import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = getSupabaseAdmin();

    // Use Supabase to send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://pod3leads.vercel.app"}/auth/callback?type=recovery`,
    });

    if (error) {
      console.error("Supabase reset password error:", error);
    }

    // Always return success for security (don't reveal if email exists)
    return NextResponse.json(
      { ok: true, message: "If an account exists with this email, a reset link has been sent" },
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
