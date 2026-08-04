import { and, asc, desc, eq, inArray, lte } from "drizzle-orm";

import { episodes, seasons, titles as titlesTable, userEpisodeProgress, userLibrary } from "@/db/schema";
import { db } from "@/lib/db";
import { getWatchedEpisodeCounts } from "@/lib/progress";
import { todayBrDateString } from "@/lib/release-dates";
import { syncSeasonEpisodes } from "@/lib/tmdb-sync";

export interface NextEpisodeItem {
  titleId: string;
  tmdbId: number;
  showName: string;
  posterPath: string | null;
  episodeId: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string | null;
  stillPath: string | null;
  watchProvidersBr: unknown;
}

interface ShowRef {
  titleId: string;
  tmdbId: number;
  name: string;
  posterPath: string | null;
  watchProvidersBr: unknown;
}

// The next aired-but-unwatched episode for a single show — the "what's next"
// computation shared by both getNextEpisodesToWatch (the dashboard list) and
// getNextEpisodeForShow (a single show, e.g. right after the user marks an
// episode watched). Only syncs the one season that's actually relevant (not
// the whole show), and returns null for shows that are fully caught up on
// what's aired so far — those belong in "Em breve" instead, once their next
// episode airs.
async function computeNextEpisodeForShow(userId: string, show: ShowRef): Promise<NextEpisodeItem | null> {
  const seasonRows = await db
    .select({ id: seasons.id, seasonNumber: seasons.seasonNumber, episodeCount: seasons.episodeCount })
    .from(seasons)
    .where(eq(seasons.titleId, show.titleId))
    .orderBy(asc(seasons.seasonNumber));
  if (seasonRows.length === 0) return null;

  const watchedCounts = await getWatchedEpisodeCounts(
    userId,
    seasonRows.map((s) => s.id),
  );

  // Season 0 is TMDb's convention for specials — not part of the main watch
  // order, so it's skipped when picking up where the user left off.
  const candidateSeason = seasonRows.find(
    (s) => s.seasonNumber > 0 && (watchedCounts.get(s.id) ?? 0) < (s.episodeCount ?? 0),
  );
  if (!candidateSeason) return null;

  await syncSeasonEpisodes(candidateSeason.id, show.titleId, show.tmdbId, candidateSeason.seasonNumber);

  const airedEpisodes = await db
    .select()
    .from(episodes)
    .where(and(eq(episodes.seasonId, candidateSeason.id), lte(episodes.airDate, todayBrDateString())))
    .orderBy(asc(episodes.episodeNumber));
  if (airedEpisodes.length === 0) return null;

  const watchedIds = new Set(
    (
      await db
        .select({ episodeId: userEpisodeProgress.episodeId })
        .from(userEpisodeProgress)
        .where(
          and(
            eq(userEpisodeProgress.userId, userId),
            inArray(
              userEpisodeProgress.episodeId,
              airedEpisodes.map((e) => e.id),
            ),
          ),
        )
    ).map((row) => row.episodeId),
  );

  const nextEpisode = airedEpisodes.find((e) => !watchedIds.has(e.id));
  if (!nextEpisode) return null;

  return {
    titleId: show.titleId,
    tmdbId: show.tmdbId,
    showName: show.name,
    posterPath: show.posterPath,
    episodeId: nextEpisode.id,
    seasonNumber: candidateSeason.seasonNumber,
    episodeNumber: nextEpisode.episodeNumber,
    episodeName: nextEpisode.name,
    stillPath: nextEpisode.stillPath,
    watchProvidersBr: show.watchProvidersBr,
  };
}

// Used right after a single show's episode is toggled (dashboard flow), so
// the caller can hand the toggled card its own updated "next episode"
// directly instead of forcing a full dashboard recompute.
export async function getNextEpisodeForShow(
  userId: string,
  titleId: string,
  tmdbId: number,
): Promise<NextEpisodeItem | null> {
  const [show] = await db
    .select({ name: titlesTable.name, posterPath: titlesTable.posterPath, watchProvidersBr: titlesTable.watchProvidersBr })
    .from(titlesTable)
    .where(eq(titlesTable.id, titleId));
  if (!show) return null;

  return computeNextEpisodeForShow(userId, {
    titleId,
    tmdbId,
    name: show.name,
    posterPath: show.posterPath,
    watchProvidersBr: show.watchProvidersBr,
  });
}

/**
 * For each show in the given status ("watching" for the dashboard's
 * "Continuar assistindo", "plan_to_watch" for "Não iniciado"), the next
 * aired-but-unwatched episode. For "plan_to_watch" shows this is always the
 * first aired episode, since our status auto-derivation guarantees zero
 * watched episodes there — it's the same "what's next" computation either
 * way.
 */
export async function getNextEpisodesToWatch(
  userId: string,
  status: "watching" | "plan_to_watch",
  limit = 6,
): Promise<NextEpisodeItem[]> {
  const shows = await db
    .select({
      titleId: titlesTable.id,
      tmdbId: titlesTable.tmdbId,
      name: titlesTable.name,
      posterPath: titlesTable.posterPath,
      watchProvidersBr: titlesTable.watchProvidersBr,
    })
    .from(userLibrary)
    .innerJoin(titlesTable, eq(userLibrary.titleId, titlesTable.id))
    .where(and(eq(userLibrary.userId, userId), eq(userLibrary.status, status), eq(titlesTable.mediaType, "tv")))
    .orderBy(desc(userLibrary.updatedAt));

  const results: NextEpisodeItem[] = [];

  // Processed in limit-sized batches — rather than one sequential loop over
  // every show — so each batch's DB round trips and TMDb season sync run
  // concurrently. Batched (instead of one giant Promise.all over the whole
  // list) so a user with many shows in this status doesn't force *all* of
  // them to sync at once just to fill a handful of slots; this stops once
  // enough valid results are found, preserving the updatedAt-priority order.
  for (let i = 0; i < shows.length && results.length < limit; i += limit) {
    const batch = shows.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map((show) => computeNextEpisodeForShow(userId, show)));
    for (const item of batchResults) {
      if (item) results.push(item);
    }
  }

  return results.slice(0, limit);
}
