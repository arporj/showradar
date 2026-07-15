import Papa from "papaparse";
import { unzipSync } from "fflate";

import { normalizeSearchText } from "@/lib/utils";

// Only these files are ever inflated from the uploaded ZIP — everything else
// (comments, reactions, auth tokens, session/device data) is skipped before
// decompression even runs, not just ignored after the fact. See TV Time
// Capsule (github.com/Portvgal/tv-time-capsule/app/js/app.js) for the
// confirmed file names/column aliases this parser is based on.
const WATCH_EVENT_FILES = ["tracking-prod-records-v2.csv", "tracking-prod-records.csv"];
const FOLLOWED_SHOW_FILES = ["followed_tv_show.csv", "user_tv_show_data.csv"];
const TARGET_FILES = [...WATCH_EVENT_FILES, ...FOLLOWED_SHOW_FILES];

export interface ParsedEpisodeTuple {
  seasonNumber: number;
  episodeNumber: number;
  watchedAt: string;
}

export interface ParsedImportItem {
  rawTitle: string;
  canonicalKey: string;
  mediaType: "movie" | "tv";
  yearHint: number | null;
  episodes: ParsedEpisodeTuple[];
  movieWatchedAt: string | null;
}

export class TvTimeExportError extends Error {}

function fileBaseName(entryName: string) {
  const parts = entryName.split("/");
  return parts[parts.length - 1];
}

function firstNonEmpty(...values: (string | undefined)[]) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function parseYear(value: string | undefined) {
  const match = value?.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function parseDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function earlierDate(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

interface RawRow {
  [key: string]: string | undefined;
}

interface Group {
  rawTitle: string;
  mediaType: "movie" | "tv";
  yearHint: number | null;
  episodeMap: Map<string, ParsedEpisodeTuple>;
  movieWatchedAt: string | null;
}

/**
 * Parses a TV Time GDPR export ZIP into one item per distinct show/movie,
 * with its watched (season, episode) tuples (or a single watched date for a
 * movie). Pure and network-free — no DB/TMDb calls happen here, which is
 * what lets `startTvTimeImport` run this synchronously inside one request
 * while the actual TMDb matching happens later in small client-driven
 * batches (see src/lib/actions/import.ts).
 */
export function parseTvTimeExport(zipBytes: Uint8Array): ParsedImportItem[] {
  const entries = unzipSync(zipBytes, {
    filter: (file) => TARGET_FILES.includes(fileBaseName(file.name)),
  });

  const byBaseName = new Map<string, Uint8Array>();
  for (const [name, data] of Object.entries(entries)) {
    byBaseName.set(fileBaseName(name), data);
  }

  const watchFileName = WATCH_EVENT_FILES.find((name) => byBaseName.has(name));
  const hasFollowedFile = FOLLOWED_SHOW_FILES.some((name) => byBaseName.has(name));
  if (!watchFileName && !hasFollowedFile) {
    throw new TvTimeExportError("Arquivo não parece ser uma exportação do TV Time.");
  }

  const decoder = new TextDecoder("utf-8");
  const groups = new Map<string, Group>();

  function groupKey(canonicalKey: string, mediaType: "movie" | "tv") {
    return `${mediaType}:${canonicalKey}`;
  }

  if (watchFileName) {
    const csvText = decoder.decode(byBaseName.get(watchFileName));
    const { data: rows } = Papa.parse<RawRow>(csvText, { header: true, skipEmptyLines: true });

    for (const row of rows) {
      const movieName = row.movie_name?.trim();
      const showName = firstNonEmpty(row.series_name, row.tv_show_name);
      const isMovie = !!movieName;
      const rawTitle = isMovie ? movieName! : showName;
      if (!rawTitle) continue;

      const type = (row.type ?? "").trim().toLowerCase();
      // "follow"/"towatch" rows only mean the item is tracked, not watched —
      // they contribute no tuple, but a defensive-parse group is still
      // useful so a later followed_tv_show.csv pass doesn't need to guess.
      const countsAsWatched = type === "" || type === "watch" || type === "rewatch";

      const canonicalKey = normalizeSearchText(rawTitle);
      const key = groupKey(canonicalKey, isMovie ? "movie" : "tv");
      let group = groups.get(key);
      if (!group) {
        group = {
          rawTitle,
          mediaType: isMovie ? "movie" : "tv",
          yearHint: null,
          episodeMap: new Map(),
          movieWatchedAt: null,
        };
        groups.set(key, group);
      }

      const yearHint = parseYear(row.release_date);
      if (yearHint && !group.yearHint) group.yearHint = yearHint;

      if (!countsAsWatched) continue;

      const watchedAt = parseDate(firstNonEmpty(row.created_at, row.watch_date, row.updated_at));
      if (!watchedAt) continue;

      if (isMovie) {
        group.movieWatchedAt = earlierDate(group.movieWatchedAt, watchedAt);
        continue;
      }

      const seasonNumber = Number(firstNonEmpty(row.season_number, row.s_no));
      const episodeNumber = Number(firstNonEmpty(row.episode_number, row.ep_no));
      if (!Number.isFinite(seasonNumber) || !Number.isFinite(episodeNumber)) continue;

      const tupleKey = `${seasonNumber}-${episodeNumber}`;
      const existing = group.episodeMap.get(tupleKey);
      if (!existing || watchedAt < existing.watchedAt) {
        group.episodeMap.set(tupleKey, { seasonNumber, episodeNumber, watchedAt });
      }
    }
  }

  // Shows that are followed/planned with zero watched episodes never show up
  // in the watch-events file — only here. Column names for these two files
  // haven't been confirmed against a real sample (unlike the watch-events
  // file, verified against TV Time Capsule's parser), so alias resolution is
  // deliberately generous.
  for (const fileName of FOLLOWED_SHOW_FILES) {
    const bytes = byBaseName.get(fileName);
    if (!bytes) continue;
    const csvText = decoder.decode(bytes);
    const { data: rows } = Papa.parse<RawRow>(csvText, { header: true, skipEmptyLines: true });

    for (const row of rows) {
      const rawTitle = firstNonEmpty(row.series_name, row.tv_show_name, row.name, row.title);
      if (!rawTitle) continue;

      const canonicalKey = normalizeSearchText(rawTitle);
      const key = groupKey(canonicalKey, "tv");
      if (groups.has(key)) continue;

      groups.set(key, {
        rawTitle,
        mediaType: "tv",
        yearHint: parseYear(row.release_date),
        episodeMap: new Map(),
        movieWatchedAt: null,
      });
    }
  }

  return [...groups.values()].map((group) => ({
    rawTitle: group.rawTitle,
    canonicalKey: normalizeSearchText(group.rawTitle),
    mediaType: group.mediaType,
    yearHint: group.yearHint,
    episodes: [...group.episodeMap.values()],
    movieWatchedAt: group.movieWatchedAt,
  }));
}
