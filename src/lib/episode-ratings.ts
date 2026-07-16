import { and, eq, sql } from "drizzle-orm";

import { episodeRatings } from "@/db/schema";
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
