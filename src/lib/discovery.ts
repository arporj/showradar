import { and, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { dismissedRecommendations, follows, titles as titlesTable, userLibrary, users } from "@/db/schema";
import { db } from "@/lib/db";
import { getRatingSummaries } from "@/lib/ratings";
import { getTitleRecommendations, type TmdbMediaType, type TmdbSearchResult } from "@/lib/tmdb";
import type { FollowStatus } from "@/lib/user-search";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Bounds how many TMDb /recommendations calls a single page load can trigger
// — these run in parallel, so this caps latency, not just request count.
const RECOMMENDATION_SOURCE_LIMIT = 6;

// The shown `limit` is shuffled out of this much bigger pool of top
// candidates, so reloading the page varies both the order and the actual
// titles shown instead of always surfacing the same `limit` in the same spot.
const RECOMMENDATION_POOL_SIZE_MULTIPLIER = 3;

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * "Recomendados para você": seeded from the user's most recently completed
 * titles (the strongest positive signal we have — stronger than a plain
 * library add, which could just be "meaning to watch"), fanned out through
 * TMDb's /recommendations (falling back to /similar, see lib/tmdb.ts) and
 * merged by how many source titles recommended the same candidate. Titles
 * already in the user's library (any status, including dropped) or
 * explicitly dismissed by the user are excluded. The final `limit` is
 * shuffled from the top-ranked pool (see RECOMMENDATION_POOL_SIZE_MULTIPLIER)
 * so the showcase doesn't render in the exact same order — or with the exact
 * same titles — on every visit.
 */
export async function getRecommendedForYou(viewerId: string, limit = 10): Promise<TmdbSearchResult[]> {
  const [libraryRows, dismissedRows] = await Promise.all([
    db
      .select({ tmdbId: titlesTable.tmdbId, mediaType: titlesTable.mediaType, status: userLibrary.status, watchedAt: userLibrary.watchedAt })
      .from(userLibrary)
      .innerJoin(titlesTable, eq(userLibrary.titleId, titlesTable.id))
      .where(eq(userLibrary.userId, viewerId)),
    db
      .select({ tmdbId: dismissedRecommendations.tmdbId, mediaType: dismissedRecommendations.mediaType })
      .from(dismissedRecommendations)
      .where(eq(dismissedRecommendations.userId, viewerId)),
  ]);

  const sourceRows = libraryRows
    .filter((row) => row.status === "completed")
    .sort((a, b) => (b.watchedAt?.getTime() ?? 0) - (a.watchedAt?.getTime() ?? 0))
    .slice(0, RECOMMENDATION_SOURCE_LIMIT);

  if (sourceRows.length === 0) return [];

  const excludedKeys = new Set([
    ...libraryRows.map((row) => `${row.mediaType}-${row.tmdbId}`),
    ...dismissedRows.map((row) => `${row.mediaType}-${row.tmdbId}`),
  ]);

  const perSourceResults = await Promise.all(
    sourceRows.map((row) => getTitleRecommendations(row.mediaType, row.tmdbId).catch(() => [] as TmdbSearchResult[])),
  );

  const candidates = new Map<string, { result: TmdbSearchResult; hits: number }>();
  for (const results of perSourceResults) {
    for (const result of results) {
      const key = `${result.media_type}-${result.id}`;
      if (excludedKeys.has(key)) continue;
      const existing = candidates.get(key);
      if (existing) existing.hits += 1;
      else candidates.set(key, { result, hits: 1 });
    }
  }

  const pool = [...candidates.values()]
    .sort((a, b) => b.hits - a.hits || (b.result.popularity ?? 0) - (a.result.popularity ?? 0))
    .slice(0, limit * RECOMMENDATION_POOL_SIZE_MULTIPLIER);

  return shuffle(pool)
    .slice(0, limit)
    .map((entry) => entry.result);
}

/**
 * "Títulos parecidos" on a title's own detail page — unlike
 * getRecommendedForYou above, this is scoped to a single source title (not
 * seeded from the viewer's whole library) and doesn't exclude titles already
 * in the viewer's library; it just flags them `inLibrary` so the card can
 * show "Adicionado", same as search results already do.
 */
export async function getSimilarTitles(
  viewerId: string | undefined,
  mediaType: TmdbMediaType,
  tmdbId: number,
  limit = 10,
): Promise<TmdbSearchResult[]> {
  const results = await getTitleRecommendations(mediaType, tmdbId).catch(() => [] as TmdbSearchResult[]);
  const candidates = results.filter((result) => result.id !== tmdbId).slice(0, limit);
  if (!viewerId || candidates.length === 0) return candidates;

  const libraryRows = await db
    .select({ tmdbId: titlesTable.tmdbId, mediaType: titlesTable.mediaType })
    .from(userLibrary)
    .innerJoin(titlesTable, eq(userLibrary.titleId, titlesTable.id))
    .where(
      and(
        eq(userLibrary.userId, viewerId),
        inArray(
          titlesTable.tmdbId,
          candidates.map((result) => result.id),
        ),
      ),
    );
  const libraryKeys = new Set(libraryRows.map((row) => `${row.mediaType}-${row.tmdbId}`));

  return candidates.map((result) => ({ ...result, inLibrary: libraryKeys.has(`${result.media_type}-${result.id}`) }));
}

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
  // O que o próprio usuário já assistiu nunca aparece nas vitrines de
  // descoberta — recomendação de algo já visto não tem utilidade.
  const viewerAlreadyWatched = sql`exists(
    select 1 from ${userLibrary} as viewer_watched
    where viewer_watched.user_id = ${viewerId}
      and viewer_watched.title_id = ${titlesTable.id}
      and viewer_watched.status = 'completed'
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
    .where(
      and(
        eq(userLibrary.status, "completed"),
        gte(userLibrary.updatedAt, sevenDaysAgo),
        sql`not ${viewerAlreadyWatched}`,
      ),
    )
    .groupBy(titlesTable.id)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function getMostWatchedThisWeek(viewerId: string, limit = 10) {
  return getRecentlyCompletedTitles(viewerId, limit);
}

/**
 * Reuses the same "active this week" candidate set as getMostWatchedThisWeek,
 * reordered by the real ShowRadar community rating (Fase 9) instead of the
 * TMDb score — only candidates with at least one ShowRadar rating qualify,
 * ties broken by how many ratings back that average up.
 */
export async function getTopRatedThisWeek(viewerId: string, limit = 10) {
  const candidates = await getRecentlyCompletedTitles(viewerId, 50);
  const summaries = await getRatingSummaries(candidates.map((title) => title.id));

  return candidates
    .filter((title) => summaries.has(title.id))
    .sort((a, b) => {
      const summaryA = summaries.get(a.id)!;
      const summaryB = summaries.get(b.id)!;
      return summaryB.average - summaryA.average || summaryB.count - summaryA.count;
    })
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
