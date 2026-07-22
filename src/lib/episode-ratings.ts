import { and, eq, inArray, sql } from "drizzle-orm";

import { episodeRatings, episodes } from "@/db/schema";
import { db } from "@/lib/db";

export interface EpisodeRatingSummary {
  average: number;
  count: number;
}

export async function getEpisodeRatingSummary(episodeId: string): Promise<EpisodeRatingSummary | null> {
  const [row] = await db
    .select({
      average: sql<string>`avg(${episodeRatings.rating})`,
      count: sql<number>`count(*)::int`,
    })
    .from(episodeRatings)
    .where(eq(episodeRatings.episodeId, episodeId));

  if (!row || row.count === 0) return null;
  return { average: Number(row.average), count: row.count };
}

export async function getUserEpisodeRating(episodeId: string, userId: string): Promise<number | null> {
  const [row] = await db
    .select({ rating: episodeRatings.rating })
    .from(episodeRatings)
    .where(and(eq(episodeRatings.episodeId, episodeId), eq(episodeRatings.userId, userId)));
  return row?.rating ?? null;
}

// A title rating only becomes "final" once the whole thing is watched — but
// a series in progress already has per-episode ratings. This surfaces that
// as a provisional average, one query for every in-progress title on a
// profile page instead of one round trip each (mirrors getRatingSummaries).
export async function getUserProvisionalRatingSummaries(
  userId: string,
  titleIds: string[],
): Promise<Map<string, EpisodeRatingSummary>> {
  if (titleIds.length === 0) return new Map();

  const rows = await db
    .select({
      titleId: episodes.titleId,
      average: sql<string>`avg(${episodeRatings.rating})`,
      count: sql<number>`count(*)::int`,
    })
    .from(episodeRatings)
    .innerJoin(episodes, eq(episodeRatings.episodeId, episodes.id))
    .where(and(eq(episodeRatings.userId, userId), inArray(episodes.titleId, titleIds)))
    .groupBy(episodes.titleId);

  return new Map(rows.map((row) => [row.titleId, { average: Number(row.average), count: row.count }]));
}
