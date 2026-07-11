import { eq, and } from "drizzle-orm";

import { episodes, seasons, titles } from "@/db/schema";
import { db } from "@/lib/db";
import { getMovieDetail, getTvDetail, getTvSeason, type TmdbMediaType, type TmdbWatchProviders } from "@/lib/tmdb";

function toDateOrNull(value: string | null | undefined) {
  return value ? value : null;
}

function toNumericStringOrNull(value: number | null | undefined) {
  return value != null ? value.toFixed(1) : null;
}

function watchProvidersBr(detail: { "watch/providers"?: TmdbWatchProviders }) {
  return detail["watch/providers"]?.results?.BR ?? null;
}

/**
 * Fetches a title from TMDb and upserts it (plus its seasons, for TV) into
 * the shared metadata cache. Safe to call on every detail-page view, not
 * just when adding to a library — TMDb is the source of truth, our tables
 * are just a cache keyed by (tmdb_id, media_type).
 */
export async function syncTitleFromTmdb(mediaType: TmdbMediaType, tmdbId: number): Promise<string> {
  if (mediaType === "movie") {
    const detail = await getMovieDetail(tmdbId);
    const values = {
      tmdbId: detail.id,
      mediaType: "movie" as const,
      name: detail.title,
      overview: detail.overview,
      posterPath: detail.poster_path,
      backdropPath: detail.backdrop_path,
      releaseDate: toDateOrNull(detail.release_date),
      runtime: detail.runtime,
      genres: detail.genres,
      credits: detail.credits?.cast?.slice(0, 12) ?? [],
      voteAverage: toNumericStringOrNull(detail.vote_average),
      popularity: detail.popularity != null ? String(detail.popularity) : null,
      status: detail.status,
      watchProvidersBr: watchProvidersBr(detail),
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };

    const [row] = await db
      .insert(titles)
      .values(values)
      .onConflictDoUpdate({ target: [titles.tmdbId, titles.mediaType], set: values })
      .returning({ id: titles.id });

    return row.id;
  }

  const detail = await getTvDetail(tmdbId);
  const values = {
    tmdbId: detail.id,
    mediaType: "tv" as const,
    name: detail.name,
    overview: detail.overview,
    posterPath: detail.poster_path,
    backdropPath: detail.backdrop_path,
    firstAirDate: toDateOrNull(detail.first_air_date),
    episodeRunTime: detail.episode_run_time,
    genres: detail.genres,
    credits: detail.credits?.cast?.slice(0, 12) ?? [],
    voteAverage: toNumericStringOrNull(detail.vote_average),
    popularity: detail.popularity != null ? String(detail.popularity) : null,
    status: detail.status,
    inProduction: detail.in_production,
    originCountry: detail.origin_country,
    nextEpisodeToAir: detail.next_episode_to_air,
    lastEpisodeToAir: detail.last_episode_to_air,
    watchProvidersBr: watchProvidersBr(detail),
    lastSyncedAt: new Date(),
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(titles)
    .values(values)
    .onConflictDoUpdate({ target: [titles.tmdbId, titles.mediaType], set: values })
    .returning({ id: titles.id });

  // Upsert seasons concurrently rather than one round-trip at a time — a
  // sequential loop here was adding a DB round-trip per season to every
  // detail-page view of a TV show.
  await Promise.all(
    detail.seasons.map((season) => {
      const seasonValues = {
        titleId: row.id,
        seasonNumber: season.season_number,
        name: season.name,
        overview: season.overview,
        airDate: toDateOrNull(season.air_date),
        posterPath: season.poster_path,
        episodeCount: season.episode_count,
        lastSyncedAt: new Date(),
      };

      return db
        .insert(seasons)
        .values(seasonValues)
        .onConflictDoUpdate({ target: [seasons.titleId, seasons.seasonNumber], set: seasonValues });
    }),
  );

  return row.id;
}

/**
 * Fetches one season's episodes from TMDb and upserts them into the shared
 * cache. Called on demand (when a user expands a season), not eagerly for
 * every season on a title's page load — long-running shows can have
 * hundreds of episodes across dozens of seasons.
 */
export async function syncSeasonEpisodes(
  seasonId: string,
  titleId: string,
  tmdbTvId: number,
  seasonNumber: number,
) {
  const detail = await getTvSeason(tmdbTvId, seasonNumber);

  await Promise.all(
    detail.episodes.map((episode) => {
      const values = {
        seasonId,
        titleId,
        episodeNumber: episode.episode_number,
        name: episode.name,
        overview: episode.overview,
        airDate: toDateOrNull(episode.air_date),
        runtime: episode.runtime,
        stillPath: episode.still_path,
        lastSyncedAt: new Date(),
      };

      return db
        .insert(episodes)
        .values(values)
        .onConflictDoUpdate({ target: [episodes.seasonId, episodes.episodeNumber], set: values });
    }),
  );
}

export async function getCachedTitleId(mediaType: TmdbMediaType, tmdbId: number) {
  const [row] = await db
    .select({ id: titles.id })
    .from(titles)
    .where(and(eq(titles.tmdbId, tmdbId), eq(titles.mediaType, mediaType)));
  return row?.id ?? null;
}
