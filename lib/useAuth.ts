"use client";

import { useCallback, useEffect, useState } from "react";

export interface ClientAuthUser {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  role: "ADMIN" | "MEMBER";
  image?: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<ClientAuthUser | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await res.json();
      if (data?.authenticated && data?.user) {
        setUser(data.user);
        setStatus("authenticated");
        return;
      }
      setUser(null);
      setStatus("unauthenticated");
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, status, refresh };
}
