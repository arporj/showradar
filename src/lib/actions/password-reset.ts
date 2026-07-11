"use server";

import { hash } from "@node-rs/argon2";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { passwordResetTokens, users } from "@/db/schema";
import type { ActionState } from "@/lib/actions/auth";
import { db } from "@/lib/db";
import { passwordResetEmailHtml, sendEmail } from "@/lib/email";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validation";

export type ForgotPasswordState = { error: string } | { message: string } | undefined;

const GENERIC_SENT_MESSAGE = "Se esse e-mail existir, você vai receber um link de redefinição em instantes.";
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { email } = parsed.data;

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));

  // Never reveal whether the account exists — same generic response either
  // way, so this can't be used to enumerate registered emails.
  if (user) {
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawToken);

    await db
      .delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`;

    try {
      await sendEmail({
        to: email,
        subject: "Redefinir sua senha — ShowRadar",
        htmlContent: passwordResetEmailHtml(resetUrl),
      });
    } catch (error) {
      // Swallow send failures — surfacing them would let an attacker
      // distinguish "exists but send failed" from "doesn't exist".
      console.error("Failed to send password reset email", error);
    }
  }

  return { message: GENERIC_SENT_MESSAGE };
}

export async function resetPasswordAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const token = formData.get("token");
  if (typeof token !== "string" || !token) {
    return { error: "Link inválido ou expirado. Solicite um novo." };
  }

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const tokenHash = hashToken(token);
  const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash));

  if (!row || row.usedAt !== null || row.expiresAt < new Date()) {
    return { error: "Link inválido ou expirado. Solicite um novo." };
  }

  const passwordHash = await hash(parsed.data.password);

  // Also bumps sessionVersion, same as "sign out everywhere" — invalidates
  // any existing sessions/stolen cookies after a password reset.
  await db
    .update(users)
    .set({
      passwordHash,
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, row.userId));

  const [{ usedAt }] = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.id, row.id), isNull(passwordResetTokens.usedAt)))
    .returning({ usedAt: passwordResetTokens.usedAt });

  if (!usedAt) {
    return { error: "Link inválido ou expirado. Solicite um novo." };
  }

  redirect("/login?reset=success");
}
