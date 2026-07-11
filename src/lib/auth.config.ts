import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe subset of the Auth.js config — no Credentials provider, no Drizzle
// adapter, no Node-only deps (argon2, postgres). Used by middleware, which
// runs on the Edge runtime. The full config in `auth.ts` builds on top of this
// and is used everywhere else (Server Components, Route Handlers, Actions).
export const authConfig = {
  providers: [Google],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
        session.user.username = token.username ?? null;
        session.user.avatarUrl = token.avatarUrl ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
