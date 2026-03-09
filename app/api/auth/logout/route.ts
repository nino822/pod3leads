import { NextRequest, NextResponse } from "next/server";
import { deleteSessionFromRequest, clearSessionCookie } from "@/lib/custom-auth";

export async function POST(request: NextRequest) {
  try {
    await deleteSessionFromRequest(request);
    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    console.error("logout error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
