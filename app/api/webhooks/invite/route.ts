import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

// Supabase Database Webhook fires here on INSERT into the Invite table.
// It adds the invited user to Supabase Auth so they can receive OTP codes.
//
// Setup in Supabase Dashboard:
//   Database → Webhooks → Create webhook
//   Table: Invite, Event: INSERT
//   URL: https://your-vercel-url.vercel.app/api/webhooks/invite
//   Secret: set WEBHOOK_SECRET env var and paste same value in Supabase

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    const secret = process.env.WEBHOOK_SECRET;
    if (secret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();

    // Supabase webhook payload: { type, table, record, schema, old_record }
    const record = body?.record;
    const email = typeof record?.email === "string" ? record.email.trim().toLowerCase() : null;

    if (!email) {
      return NextResponse.json({ error: "No email in payload" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Add user to Supabase Auth (email_confirm: true so they can receive OTP immediately)
    const { error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    // Ignore "already exists" errors — user may have been added to Auth manually
    if (error && !error.message.includes("already been registered")) {
      console.error("Supabase admin createUser error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
