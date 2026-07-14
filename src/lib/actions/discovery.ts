"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { dismissedRecommendations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { TmdbMediaType } from "@/lib/tmdb";

// "Recomendados para você" excludes anything dismissed here on every future
// recompute (see lib/discovery.ts::getRecommendedForYou) — permanent per
// user, not just a client-side hide for the current page load.
export async function dismissRecommendation(mediaType: TmdbMediaType, tmdbId: number) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db
    .insert(dismissedRecommendations)
    .values({ userId: session.user.id, tmdbId, mediaType })
    .onConflictDoNothing({
      target: [dismissedRecommendations.userId, dismissedRecommendations.tmdbId, dismissedRecommendations.mediaType],
    });

  revalidatePath("/search");
}
