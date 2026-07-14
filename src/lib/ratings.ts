import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { userLibrary, users } from "@/db/schema";
import { db } from "@/lib/db";

export interface RatingSummary {
  average: number;
  count: number;
}

export interface TitleReview {
  userId: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  rating: number;
  reviewText: string | null;
  reviewUpdatedAt: Date;
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

export async function getTitleReviews(titleId: string): Promise<TitleReview[]> {
  const rows = await db
    .select({
      userId: users.id,
      username: users.username,
      name: users.name,
      avatarUrl: users.avatarUrl,
      image: users.image,
      rating: userLibrary.personalRating,
      reviewText: userLibrary.reviewText,
      reviewUpdatedAt: userLibrary.reviewUpdatedAt,
    })
    .from(userLibrary)
    .innerJoin(users, eq(userLibrary.userId, users.id))
    .where(and(eq(userLibrary.titleId, titleId), isNotNull(userLibrary.personalRating)))
    .orderBy(desc(userLibrary.reviewUpdatedAt));

  return rows.map((row) => ({
    userId: row.userId,
    username: row.username,
    name: row.name,
    avatarUrl: row.avatarUrl ?? row.image,
    rating: row.rating!,
    reviewText: row.reviewText,
    reviewUpdatedAt: row.reviewUpdatedAt!,
  }));
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
