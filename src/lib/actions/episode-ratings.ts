"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { episodeRatings, userEpisodeProgress } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function revalidateEpisodePaths(tmdbTvId: number, seasonNumber: number, episodeNumber: number) {
  revalidatePath(`/title/tv/${tmdbTvId}/season/${seasonNumber}/episode/${episodeNumber}`);
}

// Same "must have watched it" guard as posting a comment
// (lib/actions/episode-comments.ts::postEpisodeComment) — mirrors the
// "completed" gate on title ratings in Fase 9 (lib/actions/ratings.ts).
export async function submitEpisodeRating(input: {
  episodeId: string;
  tmdbTvId: number;
  seasonNumber: number;
  episodeNumber: number;
  rating: number;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 10) return;

  const [watched] = await db
    .select({ episodeId: userEpisodeProgress.episodeId })
    .from(userEpisodeProgress)
    .where(and(eq(userEpisodeProgress.userId, session.user.id), eq(userEpisodeProgress.episodeId, input.episodeId)));
  if (!watched) return;

  const now = new Date();
  await db
    .insert(episodeRatings)
    .values({ userId: session.user.id, episodeId: input.episodeId, rating: input.rating, updatedAt: now })
    .onConflictDoUpdate({
      target: [episodeRatings.userId, episodeRatings.episodeId],
      set: { rating: input.rating, updatedAt: now },
    });

  revalidateEpisodePaths(input.tmdbTvId, input.seasonNumber, input.episodeNumber);
}

export async function deleteEpisodeRating(input: {
  episodeId: string;
  tmdbTvId: number;
  seasonNumber: number;
  episodeNumber: number;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db
    .delete(episodeRatings)
    .where(and(eq(episodeRatings.userId, session.user.id), eq(episodeRatings.episodeId, input.episodeId)));

  revalidateEpisodePaths(input.tmdbTvId, input.seasonNumber, input.episodeNumber);
}
