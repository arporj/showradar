"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { follows } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function sendFollowRequest(targetUserId: string, targetUsername: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (targetUserId === session.user.id) return;

  await db
    .insert(follows)
    .values({ followerId: session.user.id, followingId: targetUserId, status: "pending" })
    .onConflictDoNothing({ target: [follows.followerId, follows.followingId] });

  revalidatePath(`/user/${targetUsername}`);
}

export async function unfollow(targetUserId: string, targetUsername: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Also covers cancelling a still-pending outgoing request — same row either way.
  await db
    .delete(follows)
    .where(and(eq(follows.followerId, session.user.id), eq(follows.followingId, targetUserId)));

  revalidatePath(`/user/${targetUsername}`);
}

export async function acceptFollowRequest(followId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db
    .update(follows)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(and(eq(follows.id, followId), eq(follows.followingId, session.user.id), eq(follows.status, "pending")));

  revalidatePath("/follow-requests");
  if (session.user.username) revalidatePath(`/user/${session.user.username}`);
}

export async function declineFollowRequest(followId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Delete rather than mark "declined" — lets the requester try again later
  // instead of needing a cooldown/anti-spam mechanism that wasn't asked for.
  await db.delete(follows).where(and(eq(follows.id, followId), eq(follows.followingId, session.user.id)));

  revalidatePath("/follow-requests");
}
