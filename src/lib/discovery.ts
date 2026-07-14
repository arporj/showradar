import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { follows, titles as titlesTable, userLibrary, users } from "@/db/schema";
import { db } from "@/lib/db";
import type { TmdbMediaType } from "@/lib/tmdb";
import type { FollowStatus } from "@/lib/user-search";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface DiscoveryTitle {
  id: string;
  tmdbId: number;
  mediaType: TmdbMediaType;
  name: string;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  firstAirDate: string | null;
  voteAverage: string | null;
  watchCount: number;
  inLibrary: boolean;
}

/**
 * Titles marked "completed" by any user in the last 7 days, one row per
 * title with a watch count — the shared candidate set behind both the
 * "most watched" and "top rated this week" widgets.
 */
async function getRecentlyCompletedTitles(viewerId: string, limit: number): Promise<DiscoveryTitle[]> {
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
  const inLibrary = sql<boolean>`exists(
    select 1 from ${userLibrary} as viewer_library
    where viewer_library.user_id = ${viewerId} and viewer_library.title_id = ${titlesTable.id}
  )`;

  return db
    .select({
      id: titlesTable.id,
      tmdbId: titlesTable.tmdbId,
      mediaType: titlesTable.mediaType,
      name: titlesTable.name,
      overview: titlesTable.overview,
      posterPath: titlesTable.posterPath,
      releaseDate: titlesTable.releaseDate,
      firstAirDate: titlesTable.firstAirDate,
      voteAverage: titlesTable.voteAverage,
      watchCount: sql<number>`count(*)::int`,
      inLibrary: inLibrary.as("in_library"),
    })
    .from(userLibrary)
    .innerJoin(titlesTable, eq(userLibrary.titleId, titlesTable.id))
    .where(and(eq(userLibrary.status, "completed"), gte(userLibrary.updatedAt, sevenDaysAgo)))
    .groupBy(titlesTable.id)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function getMostWatchedThisWeek(viewerId: string, limit = 10) {
  return getRecentlyCompletedTitles(viewerId, limit);
}

/**
 * Placeholder for real community ratings (Fase 9, not implemented yet): reuses
 * the same "active this week" candidate set as getMostWatchedThisWeek, just
 * reordered by the TMDb score already cached on `titles`. Swap this to order
 * by an aggregated `personal_rating` once Fase 9 ships.
 */
export async function getTopRatedThisWeek(viewerId: string, limit = 10) {
  const candidates = await getRecentlyCompletedTitles(viewerId, 50);
  return candidates
    .filter((title) => title.voteAverage != null)
    .sort((a, b) => Number(b.voteAverage) - Number(a.voteAverage))
    .slice(0, limit);
}

export interface PopularUser {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  followerCount: number;
  followStatus: FollowStatus;
}

const viewerFollow = alias(follows, "viewer_follow");

export async function getMostPopularUsers(viewerId: string, limit = 10): Promise<PopularUser[]> {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      avatarUrl: users.avatarUrl,
      image: users.image,
      followerCount: sql<number>`count(distinct ${follows.id})::int`,
      followStatus: viewerFollow.status,
    })
    .from(follows)
    .innerJoin(users, eq(follows.followingId, users.id))
    .leftJoin(viewerFollow, and(eq(viewerFollow.followerId, viewerId), eq(viewerFollow.followingId, users.id)))
    .where(and(eq(follows.status, "accepted"), ne(users.id, viewerId)))
    .groupBy(users.id, viewerFollow.status)
    .orderBy(desc(sql`count(distinct ${follows.id})`))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    name: row.name,
    avatarUrl: row.avatarUrl ?? row.image,
    followerCount: row.followerCount,
    followStatus: row.followStatus ?? "none",
  }));
}
