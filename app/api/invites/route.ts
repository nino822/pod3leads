import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";
import { getAuthUser } from "@/lib/auth-helper";

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

    // Send invite email when configured. If delivery fails, keep the invite and return a fallback link.
    const inviterName = user.displayName || user.name || user.email || "A team member";
    const emailResult = await sendInviteEmail(normalizedEmail, normalizedName, inviterName);
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const inviteUrl = `${baseUrl}/dashboard`;

    if (!emailResult.success) {
      return NextResponse.json(
        {
          invite,
          emailSent: false,
          inviteUrl,
          warning:
            "Invite was created, but email delivery failed. Share the invite link manually.",
          details: emailResult.error || "Unknown email delivery error",
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ invite, emailSent: true, inviteUrl }, { status: 201 });
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
