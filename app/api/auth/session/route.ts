import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("sb-access-token")?.value;
    const refreshToken = request.cookies.get("sb-refresh-token")?.value;

    if (!accessToken) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Try to get user with access token
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      // Try refreshing the session
      if (refreshToken) {
        const { data: refreshData, error: refreshError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!refreshError && refreshData.user && refreshData.session) {
          const response = NextResponse.json({
            authenticated: true,
            user: {
              id: refreshData.user.id,
              email: refreshData.user.email || "",
              name: refreshData.user.user_metadata?.name || refreshData.user.email?.split("@")[0] || "",
              displayName: refreshData.user.user_metadata?.display_name || null,
            },
          });

          // Update cookies with refreshed tokens
          response.cookies.set("sb-access-token", refreshData.session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: refreshData.session.expires_in,
          });

          response.cookies.set("sb-refresh-token", refreshData.session.refresh_token!, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
          });

          return response;
        }
      }

      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.name || user.email?.split("@")[0] || "",
        displayName: user.user_metadata?.display_name || null,
      },
    });
  } catch (error) {
    console.error("session error:", error);
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
