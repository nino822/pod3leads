import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    // Use anon key for user-facing auth operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Verify OTP with Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error || !data.session) {
      return NextResponse.json(
        { error: error?.message || "Invalid or expired code" },
        { status: 401 }
      );
    }

    // Return the session tokens as cookies
    const response = NextResponse.json({
      success: true,
      user: {
        id: data.user?.id || "",
        email: data.user?.email || email,
        name: data.user?.user_metadata?.name || email.split("@")[0],
        displayName: data.user?.user_metadata?.display_name || null,
      },
    });

    // Set Supabase auth tokens as httpOnly cookies
    response.cookies.set("sb-access-token", data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: data.session.expires_in,
    });

    response.cookies.set("sb-refresh-token", data.session.refresh_token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error("verify-code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
