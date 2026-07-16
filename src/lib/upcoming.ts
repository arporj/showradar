import { and, eq, gt, inArray, ne } from "drizzle-orm";

import { episodes, seasons as seasonsTable, titles as titlesTable, userLibrary } from "@/db/schema";
import { db } from "@/lib/db";
import { todayBrDateString } from "@/lib/release-dates";
import type { TmdbEpisodeRef, TmdbMediaType } from "@/lib/tmdb";

export interface UpcomingItem {
  key: string;
  titleId: string;
  tmdbId: number;
  mediaType: TmdbMediaType;
  name: string;
  posterPath: string | null;
  nextDate: string;
  episodeLabel: string | null;
  episodeName: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  stillPath: string | null;
}

/**
 * Every future release/episode for titles already in the library (any
 * status but "dropped"), one row per episode — not collapsed to one row per
 * show. Prefers individually-synced episodes (so a show mid-season with
 * several confirmed dates ahead lists all of them) and falls back to the
 * title's cached `next_episode_to_air` for shows whose season hasn't been
 * opened yet, so coverage doesn't regress for those.
 *
 * Strictly after today, not "today or later": everywhere else in the app
 * (the episode checklist, "continuar assistindo") a same-day air_date is
 * already treated as available to watch, since TMDb only gives us a date,
 * never a release hour. Keeping "hoje" in this list too would show the same
 * episode as both "upcoming" and "already out" at once.
 */
export async function getUpcomingItems(userId: string): Promise<UpcomingItem[]> {
  const today = todayBrDateString();

  const libraryRows = await db
    .select({
      titleId: titlesTable.id,
      tmdbId: titlesTable.tmdbId,
      mediaType: titlesTable.mediaType,
      name: titlesTable.name,
      posterPath: titlesTable.posterPath,
      releaseDate: titlesTable.releaseDate,
      nextEpisodeToAir: titlesTable.nextEpisodeToAir,
    })
    .from(userLibrary)
    .innerJoin(titlesTable, eq(userLibrary.titleId, titlesTable.id))
    .where(and(eq(userLibrary.userId, userId), ne(userLibrary.status, "dropped")));

  const movieItems: UpcomingItem[] = libraryRows
    .filter((row): row is typeof row & { releaseDate: string } => row.mediaType === "movie" && !!row.releaseDate && row.releaseDate > today)
    .map((row) => ({
      key: `movie-${row.titleId}`,
      titleId: row.titleId,
      tmdbId: row.tmdbId,
      mediaType: "movie" as const,
      name: row.name,
      posterPath: row.posterPath,
      nextDate: row.releaseDate,
      episodeLabel: null,
      episodeName: null,
      seasonNumber: null,
      episodeNumber: null,
      stillPath: null,
    }));

  const tvRows = libraryRows.filter((row) => row.mediaType === "tv");
  const tvTitleIds = tvRows.map((row) => row.titleId);

  const futureEpisodeRows = tvTitleIds.length
    ? await db
        .select({
          titleId: episodes.titleId,
          seasonNumber: seasonsTable.seasonNumber,
          episodeNumber: episodes.episodeNumber,
          episodeName: episodes.name,
          airDate: episodes.airDate,
          stillPath: episodes.stillPath,
        })
        .from(episodes)
        .innerJoin(seasonsTable, eq(episodes.seasonId, seasonsTable.id))
        .where(and(inArray(episodes.titleId, tvTitleIds), gt(episodes.airDate, today)))
    : [];

  const futureByTitle = new Map<string, typeof futureEpisodeRows>();
  for (const row of futureEpisodeRows) {
    const list = futureByTitle.get(row.titleId) ?? [];
    list.push(row);
    futureByTitle.set(row.titleId, list);
  }

  const tvItems: UpcomingItem[] = [];
  for (const row of tvRows) {
    const synced = futureByTitle.get(row.titleId);
    if (synced && synced.length > 0) {
      for (const ep of synced) {
        tvItems.push({
          key: `tv-${row.titleId}-${ep.seasonNumber}-${ep.episodeNumber}`,
          titleId: row.titleId,
          tmdbId: row.tmdbId,
          mediaType: "tv",
          name: row.name,
          posterPath: row.posterPath,
          nextDate: ep.airDate!,
          episodeLabel: `T${ep.seasonNumber}E${ep.episodeNumber}`,
          episodeName: ep.episodeName,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
          stillPath: ep.stillPath,
        });
      }
      continue;
    }

    const nextEpisode = row.nextEpisodeToAir as TmdbEpisodeRef | null;
    if (nextEpisode?.air_date && nextEpisode.air_date > today) {
      tvItems.push({
        key: `tv-${row.titleId}-fallback`,
        titleId: row.titleId,
        tmdbId: row.tmdbId,
        mediaType: "tv",
        name: row.name,
        posterPath: row.posterPath,
        nextDate: nextEpisode.air_date,
        episodeLabel: `T${nextEpisode.season_number}E${nextEpisode.episode_number}`,
        episodeName: nextEpisode.name ?? null,
        seasonNumber: nextEpisode.season_number,
        episodeNumber: nextEpisode.episode_number,
        stillPath: null,
      });
    }
  }

  return [...movieItems, ...tvItems].sort((a, b) => a.nextDate.localeCompare(b.nextDate));
}

export function daysUntil(dateString: string): number {
  const msPerDay = 86_400_000;
  const today = new Date(`${todayBrDateString()}T00:00:00Z`).getTime();
  const target = new Date(`${dateString}T00:00:00Z`).getTime();
  return Math.round((target - today) / msPerDay);
}

export function formatDaysUntil(days: number): string {
  if (days <= 0) return "Hoje";
  if (days === 1) return "Amanhã";
  return `Em ${days} dias`;
}
