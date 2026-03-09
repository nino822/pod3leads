import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/spreadsheets.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      // Google invites should only be granted to verified mailbox owners.
      const isGoogleVerified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
      if (isGoogleVerified === false) {
        return false;
      }

      // Check if user is invited or already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      
      if (existingUser) return true;
      
      // Bootstrap guard: only allow first-user bypass outside production,
      // unless explicitly enabled via env flag.
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        const allowBootstrap =
          process.env.ALLOW_FIRST_USER_BOOTSTRAP === "true" || process.env.NODE_ENV !== "production";
        if (allowBootstrap) return true;
      }
      
      // Check if user is invited
      const invite = await prisma.invite.findUnique({
        where: { email },
      });
      
      return !!invite; // Only allow if invited
    },
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email! },
        });

        session.user.id = token.id as string;
        session.user.displayName =
          dbUser?.displayName ?? dbUser?.name ?? session.user.email ?? undefined;
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
      }
      return session;
    },
  },
};
