import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      // Don't expose whether email exists — return generic message
      return NextResponse.json(
        { error: "If this email is authorized, a code has been sent." },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("request-code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
