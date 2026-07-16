"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { episodeCommentLikes, episodeComments, userEpisodeProgress } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function revalidateEpisodePaths(tmdbTvId: number, seasonNumber: number, episodeNumber: number) {
  const base = `/title/tv/${tmdbTvId}/season/${seasonNumber}/episode/${episodeNumber}`;
  revalidatePath(base);
  revalidatePath(`${base}/comments`);
}

// Posting is gated on having watched the episode (checked here, not just
// hidden in the UI) — same spirit as the "completed" guard on title ratings
// (lib/actions/ratings.ts::submitRating), and keeps the comments section from
// filling with pre-air noise. Unlike a title rating, `rating` here is
// optional per post — a pure text comment (no stars) is a normal case.
export async function postEpisodeComment(input: {
  episodeId: string;
  tmdbTvId: number;
  seasonNumber: number;
  episodeNumber: number;
  body: string;
  rating: number | null;
  replyToId: string | null;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const body = input.body.trim();
  if (!body) return;
  if (input.rating != null && (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 10)) return;

  const [watched] = await db
    .select({ episodeId: userEpisodeProgress.episodeId })
    .from(userEpisodeProgress)
    .where(and(eq(userEpisodeProgress.userId, session.user.id), eq(userEpisodeProgress.episodeId, input.episodeId)));
  if (!watched) return;

  await db.insert(episodeComments).values({
    userId: session.user.id,
    episodeId: input.episodeId,
    body,
    rating: input.rating,
    replyToId: input.replyToId,
  });

  revalidateEpisodePaths(input.tmdbTvId, input.seasonNumber, input.episodeNumber);
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

export async function toggleEpisodeCommentLike(input: {
  commentId: string;
  liked: boolean;
  tmdbTvId: number;
  seasonNumber: number;
  episodeNumber: number;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (input.liked) {
    await db
      .insert(episodeCommentLikes)
      .values({ commentId: input.commentId, userId: session.user.id })
      .onConflictDoNothing({ target: [episodeCommentLikes.commentId, episodeCommentLikes.userId] });
  } else {
    await db
      .delete(episodeCommentLikes)
      .where(
        and(eq(episodeCommentLikes.commentId, input.commentId), eq(episodeCommentLikes.userId, session.user.id)),
      );
  }

  revalidateEpisodePaths(input.tmdbTvId, input.seasonNumber, input.episodeNumber);
}
