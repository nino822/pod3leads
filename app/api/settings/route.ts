import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      displayName: user.displayName || null,
      name: user.name || null,
      email: user.email,
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { displayName } = await request.json();

  if (!displayName || typeof displayName !== "string") {
    return NextResponse.json(
      { error: "Display name is required" },
      { status: 400 }
    );
  }

  // Store displayName in Supabase user_metadata
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { display_name: displayName },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    user: { displayName, name: user.name, email: user.email },
  });
}
