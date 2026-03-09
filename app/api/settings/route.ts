import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/custom-auth";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.email },
    select: {
      displayName: true,
      name: true,
      email: true,
    },
  });

  return NextResponse.json({ user });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { displayName } = await request.json();

  if (!displayName || typeof displayName !== "string") {
    return NextResponse.json(
      { error: "Display name is required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { email: session.email },
    data: { displayName },
  });

  return NextResponse.json({ user });
}
