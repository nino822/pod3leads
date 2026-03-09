import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";
import { getSessionFromRequest } from "@/lib/custom-auth";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const invites = await prisma.invite.findMany({
    where: { invitedBy: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invites });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session?.email) {
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

  const user = await prisma.user.findUnique({
    where: { email: session.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if email is already invited or already a user
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "User already has access" },
      { status: 400 }
    );
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

  // Send invite email
  const inviterName = user.displayName || user.name || user.email || "A team member";
  const emailResult = await sendInviteEmail(normalizedEmail, normalizedName, inviterName);

  if (!emailResult.success) {
    // Keep invite records accurate: if delivery fails, remove the just-created invite.
    await prisma.invite.delete({
      where: { id: invite.id },
    });

    return NextResponse.json(
      {
        error: "Invite email failed to send. Please check Gmail settings and try again.",
        details: emailResult.error || "Unknown email delivery error",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ invite }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session?.email) {
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

  const user = await prisma.user.findUnique({
    where: { email: session.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
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
