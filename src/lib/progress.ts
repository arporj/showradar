import { and, eq, inArray, sql } from "drizzle-orm";

import { episodes, userEpisodeProgress } from "@/db/schema";
import { db } from "@/lib/db";

/**
 * Watched-episode counts per season for one user, in a single query. The
 * denominator (season.episodeCount) is already cached from the title sync,
 * so this doesn't require every season's episodes to have been synced —
 * only the ones the user actually opened and marked.
 */
export async function getWatchedEpisodeCounts(userId: string | undefined, seasonIds: string[]) {
  if (!userId || seasonIds.length === 0) return new Map<string, number>();

  const rows = await db
    .select({ seasonId: episodes.seasonId, count: sql<number>`count(*)::int` })
    .from(userEpisodeProgress)
    .innerJoin(episodes, eq(userEpisodeProgress.episodeId, episodes.id))
    .where(and(eq(userEpisodeProgress.userId, userId), inArray(episodes.seasonId, seasonIds)))
    .groupBy(episodes.seasonId);

  return new Map(rows.map((row) => [row.seasonId, row.count]));
}
