"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function updateProfileVisibility(isPrivate: boolean) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db.update(users).set({ isPrivate, updatedAt: new Date() }).where(eq(users.id, session.user.id));

  revalidatePath("/settings");
  if (session.user.username) revalidatePath(`/user/${session.user.username}`);
}
