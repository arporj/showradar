import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { accounts, users } from "@/db/schema";
import { authConfig } from "@/lib/auth.config";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut, unstable_update: updateSession } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
  }),
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: "Email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase().trim()));

        if (!dbUser?.passwordHash) return null;

        const passwordValid = await verify(dbUser.passwordHash, password);
        if (!passwordValid) return null;

        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          image: dbUser.avatarUrl ?? dbUser.image,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // A Credentials provider forces Auth.js to use JWT sessions (it has no
    // concept of a persisted session row). "Log out of all devices" is
    // implemented via `users.sessionVersion` instead of a sessions table —
    // checked here on every token refresh.
    async jwt({ token, user }) {
      const userId = user?.id ?? token.sub;
      if (!userId) return token;

      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));

      if (!dbUser || (token.sessionVersion !== undefined && dbUser.sessionVersion !== token.sessionVersion)) {
        return null;
      }

      token.sub = dbUser.id;
      token.username = dbUser.username;
      token.avatarUrl = dbUser.avatarUrl ?? dbUser.image;
      token.sessionVersion = dbUser.sessionVersion;
      return token;
    },
  },
});
