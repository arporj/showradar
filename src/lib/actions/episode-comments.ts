"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { episodeCommentReactions, episodeComments, userEpisodeProgress } from "@/db/schema";
import { auth } from "@/lib/auth";
import { notifyCommentEvent, resolveMentions } from "@/lib/comment-notifications";
import type { CommentReaction } from "@/lib/comments";
import { db } from "@/lib/db";

function revalidateEpisodePaths(tmdbTvId: number, seasonNumber: number, episodeNumber: number) {
  const base = `/title/tv/${tmdbTvId}/season/${seasonNumber}/episode/${episodeNumber}`;
  revalidatePath(base);
  revalidatePath(`${base}/comments`);
}

function episodeCommentsUrl(tmdbTvId: number, seasonNumber: number, episodeNumber: number) {
  return `${process.env.NEXT_PUBLIC_APP_URL}/title/tv/${tmdbTvId}/season/${seasonNumber}/episode/${episodeNumber}/comments`;
}

// Posting is gated on having watched the episode (checked here, not just
// hidden in the UI) — same spirit as the "completed" guard on title ratings
// (lib/actions/ratings.ts::submitRating), and keeps the comments section from
// filling with pre-air noise. Returns the created row's id/createdAt (not
// the full joined shape — the caller already knows the author, since it's
// always the current user) so the client can show the comment immediately
// instead of waiting on a revalidated round-trip.
export async function postEpisodeComment(input: {
  episodeId: string;
  tmdbTvId: number;
  seasonNumber: number;
  episodeNumber: number;
  body: string;
  replyToId: string | null;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const body = input.body.trim();
  if (!body) return null;

  const [watched] = await db
    .select({ episodeId: userEpisodeProgress.episodeId })
    .from(userEpisodeProgress)
    .where(and(eq(userEpisodeProgress.userId, session.user.id), eq(userEpisodeProgress.episodeId, input.episodeId)));
  if (!watched) return null;

  const [created] = await db
    .insert(episodeComments)
    .values({
      userId: session.user.id,
      episodeId: input.episodeId,
      body,
      replyToId: input.replyToId,
    })
    .returning({ id: episodeComments.id, createdAt: episodeComments.createdAt });

  revalidateEpisodePaths(input.tmdbTvId, input.seasonNumber, input.episodeNumber);

  const actorLabel = session.user.name ?? session.user.username ?? "Alguém";
  const url = episodeCommentsUrl(input.tmdbTvId, input.seasonNumber, input.episodeNumber);
  const snippet = body.length > 100 ? `${body.slice(0, 100)}…` : body;

  if (input.replyToId) {
    const [original] = await db
      .select({ userId: episodeComments.userId })
      .from(episodeComments)
      .where(eq(episodeComments.id, input.replyToId));
    if (original) {
      await notifyCommentEvent({
        recipientUserId: original.userId,
        actorUserId: session.user.id,
        type: "reply",
        title: "Responderam seu comentário",
        body: `${actorLabel} respondeu: "${snippet}"`,
        url,
        episodeId: input.episodeId,
        dedupSuffix: created.id,
      });
    }
  }

  const mentioned = await resolveMentions(body);
  for (const user of mentioned) {
    await notifyCommentEvent({
      recipientUserId: user.id,
      actorUserId: session.user.id,
      type: "mention",
      title: "Você foi mencionado num comentário",
      body: `${actorLabel} mencionou você: "${snippet}"`,
      url,
      episodeId: input.episodeId,
      dedupSuffix: created.id,
    });
  }

  return created;
}

export async function deleteEpisodeComment(input: {
  commentId: string;
  tmdbTvId: number;
  seasonNumber: number;
  episodeNumber: number;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db
    .delete(episodeComments)
    .where(and(eq(episodeComments.id, input.commentId), eq(episodeComments.userId, session.user.id)));

  revalidateEpisodePaths(input.tmdbTvId, input.seasonNumber, input.episodeNumber);
}

export async function setEpisodeCommentReaction(input: {
  commentId: string;
  reaction: CommentReaction | null;
  tmdbTvId: number;
  seasonNumber: number;
  episodeNumber: number;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (input.reaction === null) {
    await db
      .delete(episodeCommentReactions)
      .where(
        and(
          eq(episodeCommentReactions.commentId, input.commentId),
          eq(episodeCommentReactions.userId, session.user.id),
        ),
      );
  } else {
    await db
      .insert(episodeCommentReactions)
      .values({ commentId: input.commentId, userId: session.user.id, type: input.reaction })
      .onConflictDoUpdate({
        target: [episodeCommentReactions.commentId, episodeCommentReactions.userId],
        set: { type: input.reaction },
      });
  }

  revalidateEpisodePaths(input.tmdbTvId, input.seasonNumber, input.episodeNumber);

  if (input.reaction !== null) {
    const [original] = await db
      .select({ userId: episodeComments.userId })
      .from(episodeComments)
      .where(eq(episodeComments.id, input.commentId));
    if (original) {
      const actorLabel = session.user.name ?? session.user.username ?? "Alguém";
      const verb = input.reaction === "like" ? "curtiu" : "reagiu com deslike a";
      await notifyCommentEvent({
        recipientUserId: original.userId,
        actorUserId: session.user.id,
        type: "reaction",
        title: "Reagiram ao seu comentário",
        body: `${actorLabel} ${verb} seu comentário`,
        url: episodeCommentsUrl(input.tmdbTvId, input.seasonNumber, input.episodeNumber),
        episodeId: undefined,
        dedupSuffix: `${input.commentId}:${session.user.id}:${input.reaction}`,
      });
    }
  }
}
