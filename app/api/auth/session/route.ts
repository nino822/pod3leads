import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/custom-auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error("session error:", error);
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
