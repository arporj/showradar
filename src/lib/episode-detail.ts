import { and, eq } from "drizzle-orm";

import { episodes, seasons, userEpisodeProgress } from "@/db/schema";
import { db } from "@/lib/db";
import { syncSeasonEpisodes } from "@/lib/tmdb-sync";

// Resolves the (season_number, episode_number) pair from the episode page's
// URL into the actual episode row, syncing the season from TMDb first (same
// on-demand pattern as loadSeasonEpisodes in lib/actions/episodes.ts — the
// route only carries human-facing numbers, not the internal season/episode
// UUIDs the rest of the app keys off of).
export async function getEpisodeByNumbers(input: {
  titleId: string;
  tmdbTvId: number;
  seasonNumber: number;
  episodeNumber: number;
  userId: string | undefined;
}) {
  const [season] = await db
    .select()
    .from(seasons)
    .where(and(eq(seasons.titleId, input.titleId), eq(seasons.seasonNumber, input.seasonNumber)));
  if (!season) return null;

  await syncSeasonEpisodes(season.id, input.titleId, input.tmdbTvId, input.seasonNumber);

  const [episode] = await db
    .select()
    .from(episodes)
    .where(and(eq(episodes.seasonId, season.id), eq(episodes.episodeNumber, input.episodeNumber)));
  if (!episode) return null;

  const watched = input.userId
    ? (
        await db
          .select({ episodeId: userEpisodeProgress.episodeId })
          .from(userEpisodeProgress)
          .where(and(eq(userEpisodeProgress.userId, input.userId), eq(userEpisodeProgress.episodeId, episode.id)))
      ).length > 0
    : false;

  return { episode, season, watched };
}
