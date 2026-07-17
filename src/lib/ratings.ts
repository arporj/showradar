import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { userLibrary } from "@/db/schema";
import { db } from "@/lib/db";

export interface RatingSummary {
  average: number;
  count: number;
}

export async function getTitleRatingSummary(titleId: string): Promise<RatingSummary | null> {
  const [row] = await db
    .select({
      average: sql<string>`avg(${userLibrary.personalRating})`,
      count: sql<number>`count(*)::int`,
    })
    .from(userLibrary)
    .where(and(eq(userLibrary.titleId, titleId), isNotNull(userLibrary.personalRating)));

  if (!row || row.count === 0) return null;
  return { average: Number(row.average), count: row.count };
}

// Batch version for the discovery engine's "top rated this week" widget —
// same shape as getWatchedEpisodeCounts in lib/progress.ts.
export async function getRatingSummaries(titleIds: string[]): Promise<Map<string, RatingSummary>> {
  if (titleIds.length === 0) return new Map();

  const rows = await db
    .select({
      titleId: userLibrary.titleId,
      average: sql<string>`avg(${userLibrary.personalRating})`,
      count: sql<number>`count(*)::int`,
    })
    .from(userLibrary)
    .where(and(inArray(userLibrary.titleId, titleIds), isNotNull(userLibrary.personalRating)))
    .groupBy(userLibrary.titleId);

  return new Map(rows.map((row) => [row.titleId, { average: Number(row.average), count: row.count }]));
}
