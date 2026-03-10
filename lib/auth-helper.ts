import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/custom-auth";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  displayName?: string | null;
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  return getSessionFromRequest(request);
}
