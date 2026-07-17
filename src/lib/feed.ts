import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";

import { episodes, follows, seasons, titles as titlesTable, userEpisodeProgress, userLibrary, users } from "@/db/schema";
import { db } from "@/lib/db";
import type { TmdbMediaType } from "@/lib/tmdb";

interface ActivityUser {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export interface EpisodeGroupEntry {
  key: string;
  watchedAt: Date;
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string | null;
}

export interface FriendActivityItem {
  key: string;
  type: "episode" | "movie" | "rating";
  watchedAt: Date;
  user: ActivityUser;
  titleId: string;
  tmdbId: number;
  mediaType: TmdbMediaType;
  name: string;
  posterPath: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  episodeName: string | null;
  rating: number | null;
  // Only non-empty for type "episode": the rest of this user's watched
  // episodes of this same title within the fetched window (excludes the one
  // already shown above, the most recent), most recent first — a marathon
  // session collapses to one feed row instead of one row per episode.
  moreEpisodes: EpisodeGroupEntry[];
}

// Raw episode rows are fetched well past `limit` before grouping, so a
// binge session (one user, one title, many episodes) collapses down to a
// single feed row instead of eating the whole feed's row budget and
// crowding out everyone else's more recent activity.
const EPISODE_FETCH_MULTIPLIER = 5;

/**
 * Recent watch activity from users the viewer follows (accepted only — a
 * pending request grants no visibility). TV shows surface as individual
 * episode events, grouped per (user, title) — see EPISODE_FETCH_MULTIPLIER
 * above and FriendActivityRow for the collapsed/expandable display; movies
 * surface once, when marked completed. A finished series isn't emitted as a
 * second "completed" event on top of its last episode — that would just be
 * the same moment counted twice.
 */
export async function getFriendActivity(userId: string, limit = 30): Promise<FriendActivityItem[]> {
  const followingRows = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(and(eq(follows.followerId, userId), eq(follows.status, "accepted")));

  const followingIds = followingRows.map((row) => row.followingId);
  if (followingIds.length === 0) return [];

  const [episodeRows, movieRows, ratingRows] = await Promise.all([
    db
      .select({
        watchedAt: userEpisodeProgress.watchedAt,
        userId: users.id,
        username: users.username,
        name: users.name,
        avatarUrl: users.avatarUrl,
        image: users.image,
        titleId: titlesTable.id,
        tmdbId: titlesTable.tmdbId,
        mediaType: titlesTable.mediaType,
        titleName: titlesTable.name,
        posterPath: titlesTable.posterPath,
        seasonNumber: seasons.seasonNumber,
        episodeNumber: episodes.episodeNumber,
        episodeName: episodes.name,
      })
      .from(userEpisodeProgress)
      .innerJoin(users, eq(userEpisodeProgress.userId, users.id))
      .innerJoin(episodes, eq(userEpisodeProgress.episodeId, episodes.id))
      .innerJoin(seasons, eq(episodes.seasonId, seasons.id))
      .innerJoin(titlesTable, eq(episodes.titleId, titlesTable.id))
      .where(inArray(userEpisodeProgress.userId, followingIds))
      .orderBy(desc(userEpisodeProgress.watchedAt))
      .limit(limit * EPISODE_FETCH_MULTIPLIER),
    db
      .select({
        watchedAt: userLibrary.watchedAt,
        userId: users.id,
        username: users.username,
        name: users.name,
        avatarUrl: users.avatarUrl,
        image: users.image,
        titleId: titlesTable.id,
        tmdbId: titlesTable.tmdbId,
        mediaType: titlesTable.mediaType,
        titleName: titlesTable.name,
        posterPath: titlesTable.posterPath,
      })
      .from(userLibrary)
      .innerJoin(users, eq(userLibrary.userId, users.id))
      .innerJoin(titlesTable, eq(userLibrary.titleId, titlesTable.id))
      .where(
        and(
          inArray(userLibrary.userId, followingIds),
          eq(userLibrary.status, "completed"),
          eq(titlesTable.mediaType, "movie"),
          isNotNull(userLibrary.watchedAt),
        ),
      )
      .orderBy(desc(userLibrary.watchedAt))
      .limit(limit),
    db
      .select({
        reviewCreatedAt: userLibrary.reviewCreatedAt,
        userId: users.id,
        username: users.username,
        name: users.name,
        avatarUrl: users.avatarUrl,
        image: users.image,
        titleId: titlesTable.id,
        tmdbId: titlesTable.tmdbId,
        mediaType: titlesTable.mediaType,
        titleName: titlesTable.name,
        posterPath: titlesTable.posterPath,
        rating: userLibrary.personalRating,
      })
      .from(userLibrary)
      .innerJoin(users, eq(userLibrary.userId, users.id))
      .innerJoin(titlesTable, eq(userLibrary.titleId, titlesTable.id))
      .where(
        and(
          inArray(userLibrary.userId, followingIds),
          isNotNull(userLibrary.personalRating),
          isNotNull(userLibrary.reviewCreatedAt),
        ),
      )
      .orderBy(desc(userLibrary.reviewCreatedAt))
      .limit(limit),
  ]);

  // Group raw episode rows by (user, title) — same user, other titles stay
  // separate rows, and so does the same title watched by a different user.
  const episodeGroups = new Map<string, typeof episodeRows>();
  for (const row of episodeRows) {
    const groupKey = `${row.userId}-${row.titleId}`;
    const group = episodeGroups.get(groupKey);
    if (group) group.push(row);
    else episodeGroups.set(groupKey, [row]);
  }

  const episodeItems: FriendActivityItem[] = [...episodeGroups.values()].map((rows) => {
    const [primary, ...rest] = rows.slice().sort((a, b) => b.watchedAt.getTime() - a.watchedAt.getTime());
    return {
      key: `episode-${primary.userId}-${primary.titleId}`,
      type: "episode" as const,
      watchedAt: primary.watchedAt,
      user: { id: primary.userId, username: primary.username, name: primary.name, avatarUrl: primary.avatarUrl ?? primary.image },
      titleId: primary.titleId,
      tmdbId: primary.tmdbId,
      mediaType: primary.mediaType,
      name: primary.titleName,
      posterPath: primary.posterPath,
      seasonNumber: primary.seasonNumber,
      episodeNumber: primary.episodeNumber,
      episodeName: primary.episodeName,
      rating: null,
      moreEpisodes: rest.map((row) => ({
        key: `episode-${row.userId}-${row.titleId}-${row.seasonNumber}-${row.episodeNumber}`,
        watchedAt: row.watchedAt,
        seasonNumber: row.seasonNumber,
        episodeNumber: row.episodeNumber,
        episodeName: row.episodeName,
      })),
    };
  });

  const items: FriendActivityItem[] = [
    ...episodeItems,
    ...movieRows.map((row) => ({
      key: `movie-${row.userId}-${row.titleId}`,
      type: "movie" as const,
      watchedAt: row.watchedAt!,
      user: { id: row.userId, username: row.username, name: row.name, avatarUrl: row.avatarUrl ?? row.image },
      titleId: row.titleId,
      tmdbId: row.tmdbId,
      mediaType: row.mediaType,
      name: row.titleName,
      posterPath: row.posterPath,
      seasonNumber: null,
      episodeNumber: null,
      episodeName: null,
      rating: null,
      moreEpisodes: [],
    })),
    ...ratingRows.map((row) => ({
      key: `rating-${row.userId}-${row.titleId}`,
      type: "rating" as const,
      watchedAt: row.reviewCreatedAt!,
      user: { id: row.userId, username: row.username, name: row.name, avatarUrl: row.avatarUrl ?? row.image },
      titleId: row.titleId,
      tmdbId: row.tmdbId,
      mediaType: row.mediaType,
      name: row.titleName,
      posterPath: row.posterPath,
      seasonNumber: null,
      episodeNumber: null,
      episodeName: null,
      rating: row.rating,
      moreEpisodes: [],
    })),
  ];

  return items.sort((a, b) => b.watchedAt.getTime() - a.watchedAt.getTime()).slice(0, limit);
}
