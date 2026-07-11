"use server";

import { hash } from "@node-rs/argon2";
import { eq, or, sql } from "drizzle-orm";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { users } from "@/db/schema";
import { auth, signIn, updateSession } from "@/lib/auth";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import { db } from "@/lib/db";
import { loginSchema, onboardingSchema, signupSchema } from "@/lib/validation";

export type ActionState = { error?: string } | undefined;

function safeRedirectTarget(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export async function signupAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    username: formData.get("username"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { username, name, email, password } = parsed.data;

  const [existing] = await db
    .select({ id: users.id, username: users.username, email: users.email })
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)));

  if (existing) {
    return {
      error:
        existing.email === email
          ? "Já existe uma conta com esse e-mail"
          : "Esse nome de usuário já está em uso",
    };
  }

  const passwordHash = await hash(password);

  await db.insert(users).values({
    username,
    name,
    email,
    passwordHash,
    avatarUrl: getDefaultAvatarUrl(username),
    avatarSource: "default",
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Conta criada. Faça login para continuar." };
    }
    throw error;
  }
}

export async function loginAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const redirectTo = safeRedirectTarget(formData.get("callbackUrl"));

  try {
    await signIn("credentials", { ...parsed.data, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-mail ou senha inválidos" };
    }
    throw error;
  }
}

export async function setUsernameAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = onboardingSchema.safeParse({ username: formData.get("username") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { username } = parsed.data;

  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
  if (taken && taken.id !== session.user.id) {
    return { error: "Esse nome de usuário já está em uso" };
  }

  await db
    .update(users)
    .set({
      username,
      avatarUrl: session.user.avatarUrl ?? getDefaultAvatarUrl(username),
      avatarSource: session.user.avatarUrl ? "oauth" : "default",
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  // The JWT cookie still has the pre-onboarding claims (username: null) until
  // refreshed — without this, the proxy would bounce us right back here.
  await updateSession({});

  redirect("/dashboard");
}

export async function logoutEverywhereAction() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await db
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, session.user.id));

  redirect("/login");
}
