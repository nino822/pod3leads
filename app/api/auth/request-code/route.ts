import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getRetryAfterSeconds(message: string) {
  const match = message.match(/after\s+(\d+)\s+second/i);
  return match ? Number(match[1]) : null;
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
      console.error("Supabase OTP send error:", error.message);
      const retryAfter = getRetryAfterSeconds(error.message);
      const details =
        error.message.includes("Signups not allowed")
          ? "Supabase Auth setting is blocking OTP. Enable Email signups in Supabase Auth settings, then try again."
          : retryAfter
            ? `Too many OTP requests. Please wait ${retryAfter} seconds and try again.`
            : error.message;
      return NextResponse.json(
        {
          error: "Failed to send OTP code",
          details,
          retryAfter,
        },
        {
          status: retryAfter ? 429 : 400,
          headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined,
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("request-code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
