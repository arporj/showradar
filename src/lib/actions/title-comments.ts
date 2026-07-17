"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { titleCommentReactions, titleComments, userLibrary } from "@/db/schema";
import { auth } from "@/lib/auth";
import { notifyCommentEvent, resolveMentions } from "@/lib/comment-notifications";
import type { CommentReaction } from "@/lib/comments";
import { db } from "@/lib/db";
import type { TmdbMediaType } from "@/lib/tmdb";

function revalidateTitlePaths(mediaType: TmdbMediaType, tmdbId: number) {
  const base = `/title/${mediaType}/${tmdbId}`;
  revalidatePath(base);
  revalidatePath(`${base}/comments`);
}

function titleCommentsUrl(mediaType: TmdbMediaType, tmdbId: number) {
  return `${process.env.NEXT_PUBLIC_APP_URL}/title/${mediaType}/${tmdbId}/comments`;
}

// Posting requires the title to be "completed" in the user's library — same
// guard as the star rating (lib/actions/ratings.ts::submitRating), mirroring
// the "must have watched it" gate on episode comments.
export async function postTitleComment(input: {
  titleId: string;
  mediaType: TmdbMediaType;
  tmdbId: number;
  body: string;
  replyToId: string | null;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const body = input.body.trim();
  if (!body) return null;

  const [entry] = await db
    .select({ status: userLibrary.status })
    .from(userLibrary)
    .where(and(eq(userLibrary.userId, session.user.id), eq(userLibrary.titleId, input.titleId)));
  if (!entry || entry.status !== "completed") return null;

  const [created] = await db
    .insert(titleComments)
    .values({ userId: session.user.id, titleId: input.titleId, body, replyToId: input.replyToId })
    .returning({ id: titleComments.id, createdAt: titleComments.createdAt });

  revalidateTitlePaths(input.mediaType, input.tmdbId);

  const actorLabel = session.user.name ?? session.user.username ?? "Alguém";
  const url = titleCommentsUrl(input.mediaType, input.tmdbId);
  const snippet = body.length > 100 ? `${body.slice(0, 100)}…` : body;

  if (input.replyToId) {
    const [original] = await db
      .select({ userId: titleComments.userId })
      .from(titleComments)
      .where(eq(titleComments.id, input.replyToId));
    if (original) {
      await notifyCommentEvent({
        recipientUserId: original.userId,
        actorUserId: session.user.id,
        type: "reply",
        title: "Responderam seu comentário",
        body: `${actorLabel} respondeu: "${snippet}"`,
        url,
        titleId: input.titleId,
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
      titleId: input.titleId,
      dedupSuffix: created.id,
    });
  }

  return created;
}

export async function deleteTitleComment(input: { commentId: string; mediaType: TmdbMediaType; tmdbId: number }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db
    .delete(titleComments)
    .where(and(eq(titleComments.id, input.commentId), eq(titleComments.userId, session.user.id)));

  revalidateTitlePaths(input.mediaType, input.tmdbId);
}

export async function setTitleCommentReaction(input: {
  commentId: string;
  titleId: string;
  reaction: CommentReaction | null;
  mediaType: TmdbMediaType;
  tmdbId: number;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (input.reaction === null) {
    await db
      .delete(titleCommentReactions)
      .where(
        and(eq(titleCommentReactions.commentId, input.commentId), eq(titleCommentReactions.userId, session.user.id)),
      );
  } else {
    await db
      .insert(titleCommentReactions)
      .values({ commentId: input.commentId, userId: session.user.id, type: input.reaction })
      .onConflictDoUpdate({
        target: [titleCommentReactions.commentId, titleCommentReactions.userId],
        set: { type: input.reaction },
      });
  }

  revalidateTitlePaths(input.mediaType, input.tmdbId);

  if (input.reaction !== null) {
    const [original] = await db
      .select({ userId: titleComments.userId })
      .from(titleComments)
      .where(eq(titleComments.id, input.commentId));
    if (original) {
      const actorLabel = session.user.name ?? session.user.username ?? "Alguém";
      const verb = input.reaction === "like" ? "curtiu" : "reagiu com deslike a";
      await notifyCommentEvent({
        recipientUserId: original.userId,
        actorUserId: session.user.id,
        type: "reaction",
        title: "Reagiram ao seu comentário",
        body: `${actorLabel} ${verb} seu comentário`,
        url: titleCommentsUrl(input.mediaType, input.tmdbId),
        titleId: input.titleId,
        dedupSuffix: `${input.commentId}:${session.user.id}:${input.reaction}`,
      });
    }
  }
}
