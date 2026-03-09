import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      displayName: true,
      name: true,
      email: true,
    },
  });

  return NextResponse.json({ user });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
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
    where: { email: session.user.email },
    data: { displayName },
  });

  return NextResponse.json({ user });
}
