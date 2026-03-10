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
      image: user.image || null,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { displayName, image } = await request.json();
    const normalizedDisplayName = typeof displayName === "string" ? displayName.trim() : "";
    const normalizedImage =
      typeof image === "string" ? (image.trim() === "" ? null : image.trim()) : undefined;

    if (!normalizedDisplayName) {
      return NextResponse.json(
        { error: "Display name is required" },
        { status: 400 }
      );
    }

    const updateData: { displayName: string; image?: string | null } = {
      displayName: normalizedDisplayName,
    };
    if (normalizedImage !== undefined) {
      updateData.image = normalizedImage;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        displayName: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({
      user: {
        displayName: updated.displayName,
        name: updated.name,
        email: updated.email,
        image: updated.image || null,
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
