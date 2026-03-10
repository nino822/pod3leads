import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helper";
import { getSupabaseAdmin } from "@/lib/supabase-server";

async function syncInviteToSupabaseAuth(email: string, role: "ADMIN" | "MEMBER", inviteUrl: string) {
  const supabaseAdmin = getSupabaseAdmin();

  // First try sending Supabase invite email.
  const { error: inviteEmailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: inviteUrl,
      data: { role },
    }
  );

  if (!inviteEmailError) {
    return { emailSent: true, warning: null as string | null, details: null as string | null };
  }

  // Fallback: provision auth account directly so OTP still works.
  const { error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { role },
  });

  const inviteErrorMessage = inviteEmailError.message || "Unknown invite email error";
  const createUserErrorMessage = createUserError?.message || null;
  const createFailed = !!createUserErrorMessage && !createUserErrorMessage.toLowerCase().includes("already");

  if (createFailed) {
    return {
      emailSent: false,
      warning: "Invite sync failed. Check Supabase service role key and auth email settings.",
      details: `${inviteErrorMessage}; fallback create user failed: ${createUserErrorMessage}`,
    };
  }

  return {
    emailSent: false,
    warning:
      "Invite created, but invite email was not sent. User can still log in with OTP.",
    details: inviteErrorMessage,
  };
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await prisma.invite.findMany({
    where: { invitedBy: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    { invites },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, name, role } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedRole: "ADMIN" | "MEMBER" = role === "ADMIN" ? "ADMIN" : "MEMBER";

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

    const existingInvite = await prisma.invite.findUnique({ where: { email: normalizedEmail } });

    const invite = existingInvite
      ? await prisma.invite.update({
          where: { email: normalizedEmail },
          data: {
            name: normalizedName,
            role: normalizedRole,
            invitedBy: user.id,
          } as any,
        })
      : await prisma.invite.create({
          data: {
            email: normalizedEmail,
            name: normalizedName,
            role: normalizedRole,
            invitedBy: user.id,
          } as any,
        });

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

    const result = await syncInviteToSupabaseAuth(normalizedEmail, normalizedRole, inviteUrl);

    const status = existingInvite ? 200 : 201;
    return NextResponse.json(
      {
        invite,
        inviteUrl,
        emailSent: result.emailSent,
        warning: result.warning,
        details: result.details,
        resent: !!existingInvite,
      },
      { status }
    );
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

  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
