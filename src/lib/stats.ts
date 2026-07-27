import { and, eq, gte, lt, sql } from "drizzle-orm";

import { episodeWatchEvents, episodes as episodesTable, movieWatchEvents, titles as titlesTable, userLibrary } from "@/db/schema";
import { db } from "@/lib/db";

// Nem todo episódio tem runtime próprio sincronizado (só grava quando a
// temporada é aberta) — cai pra média de titles.episodeRunTime e, na
// ausência de qualquer um dos dois, uma constante razoável.
const FALLBACK_EPISODE_RUNTIME_MINUTES = 45;

export interface GenreStat {
  name: string;
  minutes: number;
}

export interface TopSeriesStat {
  titleId: string;
  tmdbId: number;
  name: string;
  posterPath: string | null;
  episodesWatched: number;
}

export interface CompletedSeriesStat {
  titleId: string;
  tmdbId: number;
  name: string;
  posterPath: string | null;
  watchedAt: Date;
}

export interface BusiestDayStat {
  date: string;
  episodesWatched: number;
}

export interface YearStats {
  year: number;
  minutesWatched: number;
  episodesWatchedCount: number;
  moviesWatchedCount: number;
  topGenres: GenreStat[];
  topSeries: TopSeriesStat[];
  seriesCompleted: CompletedSeriesStat[];
  busiestDay: BusiestDayStat | null;
}

function resolveEpisodeRuntimeMinutes(episodeRuntime: number | null, titleEpisodeRunTime: number[] | null): number {
  if (episodeRuntime) return episodeRuntime;
  if (titleEpisodeRunTime && titleEpisodeRunTime.length > 0) {
    const avg = titleEpisodeRunTime.reduce((sum, value) => sum + value, 0) / titleEpisodeRunTime.length;
    if (avg > 0) return avg;
  }
  return FALLBACK_EPISODE_RUNTIME_MINUTES;
}

function extractGenreNames(genres: unknown): string[] {
  if (!Array.isArray(genres)) return [];
  return (genres as { id: number; name: string }[]).map((g) => g.name).filter(Boolean);
}

/**
 * Anos com pelo menos um evento assistido — alimenta o seletor de ano de
 * /stats. O ano corrente sempre entra, mesmo sem nenhum dado ainda.
 */
export async function getAvailableStatsYears(userId: string): Promise<number[]> {
  const [episodeYears, movieYears] = await Promise.all([
    db
      .select({ year: sql<number>`extract(year from ${episodeWatchEvents.watchedAt})::int` })
      .from(episodeWatchEvents)
      .where(eq(episodeWatchEvents.userId, userId))
      .groupBy(sql`extract(year from ${episodeWatchEvents.watchedAt})`),
    db
      .select({ year: sql<number>`extract(year from ${movieWatchEvents.watchedAt})::int` })
      .from(movieWatchEvents)
      .where(eq(movieWatchEvents.userId, userId))
      .groupBy(sql`extract(year from ${movieWatchEvents.watchedAt})`),
  ]);

  const years = new Set<number>([new Date().getUTCFullYear()]);
  for (const row of episodeYears) if (row.year != null) years.add(row.year);
  for (const row of movieYears) if (row.year != null) years.add(row.year);

  return [...years].sort((a, b) => b - a);
}

/**
 * Estatísticas do usuário num ano específico — episódios+filmes vistos,
 * horas assistidas, gêneros dominantes (por minutos, não por contagem de
 * título — sem dividir entre múltiplos gêneros do mesmo título, já que é
 * ranking e não uma pizza que precisa fechar 100%), série mais assistida e
 * dia com mais episódios (efeito "maratona").
 *
 * Episódios e filmes vêm de episode_watch_events/movie_watch_events (um
 * evento por vista, incluindo rewatches) em vez de user_episode_progress/
 * user_library diretamente — assim um rewatch em outro ano soma nas
 * estatísticas do ano em que aconteceu, em vez de só "mover" a vista
 * original de ano.
 *
 * "Séries concluídas no ano" continua usando user_library.watchedAt, que só
 * é confiável pra títulos com status "completed" hoje — mudar de status
 * limpa esse campo (ver lib/actions/library.ts e lib/actions/episodes.ts),
 * então uma série concluída e depois reaberta perde essa data. Isso é sobre
 * a conclusão da série inteira, não sobre rewatch de episódio — não é
 * coberto pelas tabelas de evento acima, é uma limitação separada e aceita.
 */
export async function getYearStats(userId: string, year: number): Promise<YearStats> {
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const startOfNextYear = new Date(Date.UTC(year + 1, 0, 1));

  const [episodeRows, movieRows, seriesCompletedRows] = await Promise.all([
    db
      .select({
        titleId: titlesTable.id,
        tmdbId: titlesTable.tmdbId,
        name: titlesTable.name,
        posterPath: titlesTable.posterPath,
        genres: titlesTable.genres,
        titleEpisodeRunTime: titlesTable.episodeRunTime,
        episodeRuntime: episodesTable.runtime,
        watchedAt: episodeWatchEvents.watchedAt,
      })
      .from(episodeWatchEvents)
      .innerJoin(episodesTable, eq(episodeWatchEvents.episodeId, episodesTable.id))
      .innerJoin(titlesTable, eq(episodesTable.titleId, titlesTable.id))
      .where(
        and(
          eq(episodeWatchEvents.userId, userId),
          gte(episodeWatchEvents.watchedAt, startOfYear),
          lt(episodeWatchEvents.watchedAt, startOfNextYear),
        ),
      ),
    db
      .select({
        genres: titlesTable.genres,
        runtime: titlesTable.runtime,
        watchedAt: movieWatchEvents.watchedAt,
      })
      .from(movieWatchEvents)
      .innerJoin(titlesTable, eq(movieWatchEvents.titleId, titlesTable.id))
      .where(
        and(
          eq(movieWatchEvents.userId, userId),
          gte(movieWatchEvents.watchedAt, startOfYear),
          lt(movieWatchEvents.watchedAt, startOfNextYear),
        ),
      ),
    db
      .select({
        titleId: titlesTable.id,
        tmdbId: titlesTable.tmdbId,
        name: titlesTable.name,
        posterPath: titlesTable.posterPath,
        watchedAt: userLibrary.watchedAt,
      })
      .from(userLibrary)
      .innerJoin(titlesTable, eq(userLibrary.titleId, titlesTable.id))
      .where(
        and(
          eq(userLibrary.userId, userId),
          eq(titlesTable.mediaType, "tv"),
          eq(userLibrary.status, "completed"),
          gte(userLibrary.watchedAt, startOfYear),
          lt(userLibrary.watchedAt, startOfNextYear),
        ),
      ),
  ]);

  let minutesWatched = 0;
  const genreMinutes = new Map<string, number>();
  const seriesEpisodeCounts = new Map<
    string,
    { titleId: string; tmdbId: number; name: string; posterPath: string | null; count: number }
  >();
  const dayCounts = new Map<string, number>();

  for (const row of episodeRows) {
    const minutes = resolveEpisodeRuntimeMinutes(row.episodeRuntime, row.titleEpisodeRunTime);
    minutesWatched += minutes;

    for (const genreName of extractGenreNames(row.genres)) {
      genreMinutes.set(genreName, (genreMinutes.get(genreName) ?? 0) + minutes);
    }

    const existing = seriesEpisodeCounts.get(row.titleId);
    if (existing) {
      existing.count += 1;
    } else {
      seriesEpisodeCounts.set(row.titleId, {
        titleId: row.titleId,
        tmdbId: row.tmdbId,
        name: row.name,
        posterPath: row.posterPath,
        count: 1,
      });
    }

    const dayKey = row.watchedAt.toISOString().slice(0, 10);
    dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
  }

  let moviesWatchedCount = 0;
  for (const row of movieRows) {
    moviesWatchedCount += 1;
    const minutes = row.runtime ?? 0;
    minutesWatched += minutes;
    for (const genreName of extractGenreNames(row.genres)) {
      genreMinutes.set(genreName, (genreMinutes.get(genreName) ?? 0) + minutes);
    }
  }

  const topGenres = [...genreMinutes.entries()]
    .map(([name, minutes]) => ({ name, minutes: Math.round(minutes) }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);

  const topSeries = [...seriesEpisodeCounts.values()]
    .map((s) => ({
      titleId: s.titleId,
      tmdbId: s.tmdbId,
      name: s.name,
      posterPath: s.posterPath,
      episodesWatched: s.count,
    }))
    .sort((a, b) => b.episodesWatched - a.episodesWatched)
    .slice(0, 5);

  let busiestDay: BusiestDayStat | null = null;
  for (const [date, count] of dayCounts) {
    if (!busiestDay || count > busiestDay.episodesWatched) busiestDay = { date, episodesWatched: count };
  }

  const seriesCompleted: CompletedSeriesStat[] = seriesCompletedRows
    .filter((row): row is typeof row & { watchedAt: Date } => row.watchedAt !== null)
    .map((row) => ({
      titleId: row.titleId,
      tmdbId: row.tmdbId,
      name: row.name,
      posterPath: row.posterPath,
      watchedAt: row.watchedAt,
    }));

  return {
    year,
    minutesWatched: Math.round(minutesWatched),
    episodesWatchedCount: episodeRows.length,
    moviesWatchedCount,
    topGenres,
    topSeries,
    seriesCompleted,
    busiestDay,
  };
}
