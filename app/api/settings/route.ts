import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { prisma } from "@/lib/prisma";

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
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { displayName } = await request.json();
    const normalizedDisplayName = typeof displayName === "string" ? displayName.trim() : "";

    if (!normalizedDisplayName) {
      return NextResponse.json(
        { error: "Display name is required" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { displayName: normalizedDisplayName },
      select: {
        displayName: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json({
      user: {
        displayName: updated.displayName,
        name: updated.name,
        email: updated.email,
      },
    });
  } catch (error) {
    console.error("Settings POST error:", error);
    return NextResponse.json(
      { error: "Failed to update display name" },
      { status: 500 }
    );
  }
}
