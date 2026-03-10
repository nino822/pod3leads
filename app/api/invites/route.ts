import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helper";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invites = await prisma.invite.findMany({
    where: { invitedBy: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invites });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, name } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedName = typeof name === "string" ? name.trim() : "";

    if (!normalizedEmail || !normalizedName) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const existingInvite = await prisma.invite.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "User already invited" },
        { status: 400 }
      );
    }

    const invite = await prisma.invite.create({
      data: {
        email: normalizedEmail,
        name: normalizedName,
        invitedBy: user.id,
      },
    });

    // Keep Auth in sync immediately so invited users can request OTP right away,
    // even if DB webhook configuration is incomplete.
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
      });
      if (error && !error.message.toLowerCase().includes("already")) {
        console.error("Failed to add invited user to Supabase Auth:", error.message);
      }
    } catch (syncError) {
      console.error("Invite auth sync error:", syncError);
    }

    const configuredBaseUrl =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    let inviteBaseUrl = configuredBaseUrl;
    try {
      inviteBaseUrl = new URL(configuredBaseUrl).origin;
    } catch {
      inviteBaseUrl = configuredBaseUrl.replace(/\/$/, "");
    }
    const inviteUrl = `${inviteBaseUrl}/dashboard`;

    // Invite record created. Supabase DB webhook will add the user to Supabase Auth
    // so they can receive OTP codes. Share the login URL with them manually.
    return NextResponse.json({ invite, inviteUrl }, { status: 201 });
  } catch (error) {
    console.error("Invite POST error:", error);
    return NextResponse.json(
      { error: "Failed to create invite", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const inviteId = searchParams.get("id");

  if (!inviteId) {
    return NextResponse.json(
      { error: "Invite ID is required" },
      { status: 400 }
    );
  }

  // Only allow deletion of invites created by this user
  const invite = await prisma.invite.findFirst({
    where: {
      id: inviteId,
      invitedBy: user.id,
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  await prisma.invite.delete({
    where: { id: inviteId },
  });

  return NextResponse.json({ success: true });
}
