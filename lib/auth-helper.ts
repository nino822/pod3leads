import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
}

/**
 * Validates the Supabase session from request cookies.
 * Returns the authenticated user or null.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const accessToken = request.cookies.get("sb-access-token")?.value;
  const refreshToken = request.cookies.get("sb-refresh-token")?.value;

  if (!accessToken) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Try to get user with access token
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (!error && data.user) {
    return {
      id: data.user.id,
      email: data.user.email!,
      name: data.user.user_metadata?.name,
      displayName: data.user.user_metadata?.display_name,
    };
  }

  // If access token expired, try refreshing
  if (refreshToken) {
    const { data: refreshData, error: refreshError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (!refreshError && refreshData.user) {
      return {
        id: refreshData.user.id,
        email: refreshData.user.email!,
        name: refreshData.user.user_metadata?.name,
        displayName: refreshData.user.user_metadata?.display_name,
      };
    }
  }

  return null;
}
