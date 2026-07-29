"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { follows } from "@/db/schema";
import { auth } from "@/lib/auth";
import { notifyCommentEvent } from "@/lib/comment-notifications";
import { db } from "@/lib/db";

function followRequestsUrl() {
  return `${process.env.NEXT_PUBLIC_APP_URL}/follow-requests`;
}

function userProfileUrl(username: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL}/user/${username}`;
}

export async function sendFollowRequest(targetUserId: string, targetUsername: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (targetUserId === session.user.id) return;

  // onConflictDoNothing means re-requesting after a prior request/unfollow
  // returns no row — only a genuinely new request should notify.
  const [created] = await db
    .insert(follows)
    .values({ followerId: session.user.id, followingId: targetUserId, status: "pending" })
    .onConflictDoNothing({ target: [follows.followerId, follows.followingId] })
    .returning({ id: follows.id });

  revalidatePath(`/user/${targetUsername}`);

  if (created) {
    const actorLabel = session.user.name ?? session.user.username ?? "Alguém";
    await notifyCommentEvent({
      recipientUserId: targetUserId,
      actorUserId: session.user.id,
      type: "follow_request",
      title: "Novo pedido para seguir você",
      body: `${actorLabel} quer seguir você`,
      url: followRequestsUrl(),
      dedupSuffix: created.id,
    });
  }
}

export async function unfollow(targetUserId: string, targetUsername: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db.transaction(async (tx) => {
    const [myRow] = await tx
      .select({ status: follows.status })
      .from(follows)
      .where(and(eq(follows.followerId, session.user.id), eq(follows.followingId, targetUserId)));

    // Also covers cancelling a still-pending outgoing request — same row either way.
    await tx
      .delete(follows)
      .where(and(eq(follows.followerId, session.user.id), eq(follows.followingId, targetUserId)));

    // Accepted relationships are always mutual (see acceptFollowRequest below),
    // so unfollowing one is "unfriending" — undo the other direction too.
    if (myRow?.status === "accepted") {
      await tx
        .delete(follows)
        .where(and(eq(follows.followerId, targetUserId), eq(follows.followingId, session.user.id)));
    }
  });

  revalidatePath(`/user/${targetUsername}`);
  revalidatePath("/friends");
}

export async function acceptFollowRequest(followId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const requesterId = await db.transaction(async (tx) => {
    const [request] = await tx
      .update(follows)
      .set({ status: "accepted", respondedAt: new Date() })
      .where(and(eq(follows.id, followId), eq(follows.followingId, session.user.id), eq(follows.status, "pending")))
      .returning({ followerId: follows.followerId });

    if (!request) return null;

    // Accepting a follow request makes the relationship mutual right away —
    // the accepter follows back automatically instead of needing a second,
    // separate approval in the other direction.
    await tx
      .insert(follows)
      .values({
        followerId: session.user.id,
        followingId: request.followerId,
        status: "accepted",
        respondedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [follows.followerId, follows.followingId],
        set: { status: "accepted", respondedAt: new Date() },
      });

    return request.followerId;
  });

  revalidatePath("/follow-requests");
  revalidatePath("/friends");
  if (session.user.username) revalidatePath(`/user/${session.user.username}`);

  if (requesterId && session.user.username) {
    const actorLabel = session.user.name ?? session.user.username ?? "Alguém";
    await notifyCommentEvent({
      recipientUserId: requesterId,
      actorUserId: session.user.id,
      type: "follow_accepted",
      title: "Seu pedido para seguir foi aceito",
      body: `${actorLabel} aceitou seu pedido para seguir`,
      url: userProfileUrl(session.user.username),
      dedupSuffix: followId,
    });
  }
}

export async function declineFollowRequest(followId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Delete rather than mark "declined" — lets the requester try again later
  // instead of needing a cooldown/anti-spam mechanism that wasn't asked for.
  await db.delete(follows).where(and(eq(follows.id, followId), eq(follows.followingId, session.user.id)));

  revalidatePath("/follow-requests");
}
