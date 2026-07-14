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

export interface FriendActivityItem {
  key: string;
  type: "episode" | "movie";
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
}

/**
 * Recent watch activity from users the viewer follows (accepted only — a
 * pending request grants no visibility). TV shows surface as individual
 * episode events; movies surface once, when marked completed. A finished
 * series isn't emitted as a second "completed" event on top of its last
 * episode — that would just be the same moment counted twice.
 */
export async function getFriendActivity(userId: string, limit = 30): Promise<FriendActivityItem[]> {
  const followingRows = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(and(eq(follows.followerId, userId), eq(follows.status, "accepted")));

  const followingIds = followingRows.map((row) => row.followingId);
  if (followingIds.length === 0) return [];

  const [episodeRows, movieRows] = await Promise.all([
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
      .limit(limit),
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
  ]);

  const items: FriendActivityItem[] = [
    ...episodeRows.map((row) => ({
      key: `episode-${row.userId}-${row.titleId}-${row.seasonNumber}-${row.episodeNumber}`,
      type: "episode" as const,
      watchedAt: row.watchedAt,
      user: { id: row.userId, username: row.username, name: row.name, avatarUrl: row.avatarUrl ?? row.image },
      titleId: row.titleId,
      tmdbId: row.tmdbId,
      mediaType: row.mediaType,
      name: row.titleName,
      posterPath: row.posterPath,
      seasonNumber: row.seasonNumber,
      episodeNumber: row.episodeNumber,
      episodeName: row.episodeName,
    })),
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
    })),
  ];

  return items.sort((a, b) => b.watchedAt.getTime() - a.watchedAt.getTime()).slice(0, limit);
}
