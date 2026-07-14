"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");
  return session;
}

export async function setUserPlan(userId: string, plan: "free" | "premium") {
  await requireAdmin();

  await db.update(users).set({ plan, updatedAt: new Date() }).where(eq(users.id, userId));

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

export async function setUserSuspended(userId: string, isSuspended: boolean) {
  await requireAdmin();

  await db.update(users).set({ isSuspended, updatedAt: new Date() }).where(eq(users.id, userId));

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}
