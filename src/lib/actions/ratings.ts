"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { userLibrary } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { TmdbMediaType } from "@/lib/tmdb";

function revalidateRatingPaths(mediaType: TmdbMediaType, tmdbId: number) {
  revalidatePath(`/title/${mediaType}/${tmdbId}`);
  revalidatePath("/feed");
  revalidatePath("/search");
}

// Ratings are gated on status "completed" (checked here, not just hidden in
// the UI — the form only renders for completed titles, but this is the real
// enforcement). Editing an existing rating doesn't touch reviewCreatedAt,
// so the feed can tell a first-time rating from a later edit.
export async function submitRating(
  titleId: string,
  mediaType: TmdbMediaType,
  tmdbId: number,
  rating: number,
  reviewText: string | null,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!Number.isInteger(rating) || rating < 1 || rating > 10) return;

  const [existing] = await db
    .select({ status: userLibrary.status, personalRating: userLibrary.personalRating })
    .from(userLibrary)
    .where(and(eq(userLibrary.userId, session.user.id), eq(userLibrary.titleId, titleId)));

  if (!existing || existing.status !== "completed") return;

  const now = new Date();
  await db
    .update(userLibrary)
    .set({
      personalRating: rating,
      reviewText: reviewText?.trim() || null,
      reviewUpdatedAt: now,
      ...(existing.personalRating == null ? { reviewCreatedAt: now } : {}),
    })
    .where(and(eq(userLibrary.userId, session.user.id), eq(userLibrary.titleId, titleId)));

  revalidateRatingPaths(mediaType, tmdbId);
}

export async function deleteRating(titleId: string, mediaType: TmdbMediaType, tmdbId: number) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db
    .update(userLibrary)
    .set({ personalRating: null, reviewText: null, reviewUpdatedAt: null, reviewCreatedAt: null })
    .where(and(eq(userLibrary.userId, session.user.id), eq(userLibrary.titleId, titleId)));

  revalidateRatingPaths(mediaType, tmdbId);
}
