import Papa from "papaparse";
import { unzipSync } from "fflate";

import { normalizeSearchText } from "@/lib/utils";

import type { ParsedImportItem } from "./types";

// Letterboxd's data export ZIP has no nested folders — these two land right
// at the root — but fileBaseName() still guards against that changing.
// Movies only: Letterboxd doesn't track TV. comments/likes/lists/reviews are
// never inflated, same privacy stance as the TV Time parser.
const DIARY_FILE = "diary.csv";
const WATCHED_FILE = "watched.csv";
const TARGET_FILES = [DIARY_FILE, WATCHED_FILE];

export class LetterboxdExportError extends Error {}

function fileBaseName(entryName: string) {
  const parts = entryName.split("/");
  return parts[parts.length - 1];
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
  yearHint: number | null;
  watchedAt: string | null;
}

/**
 * Parses a Letterboxd export ZIP into one item per distinct film, with its
 * earliest known watched date. Pure and network-free, same contract as
 * parseTvTimeExport — TMDb matching happens later in processImportBatch.
 */
export function parseLetterboxdExport(zipBytes: Uint8Array): ParsedImportItem[] {
  const entries = unzipSync(zipBytes, {
    filter: (file) => TARGET_FILES.includes(fileBaseName(file.name)),
  });

  const byBaseName = new Map<string, Uint8Array>();
  for (const [name, data] of Object.entries(entries)) {
    byBaseName.set(fileBaseName(name), data);
  }

  if (!byBaseName.has(DIARY_FILE) && !byBaseName.has(WATCHED_FILE)) {
    throw new LetterboxdExportError("Arquivo não parece ser uma exportação do Letterboxd.");
  }

  const decoder = new TextDecoder("utf-8");
  const groups = new Map<string, Group>();

  // watched.csv is the superset — every film ever logged, with just one
  // date column — so it seeds every group first. diary.csv is parsed after
  // and only ever refines the date via its more specific "Watched Date"
  // column; it never introduces a title watched.csv wouldn't already have.
  const watchedBytes = byBaseName.get(WATCHED_FILE);
  if (watchedBytes) {
    const csvText = decoder.decode(watchedBytes);
    const { data: rows } = Papa.parse<RawRow>(csvText, { header: true, skipEmptyLines: true });
    for (const row of rows) {
      const rawTitle = row["Name"]?.trim();
      if (!rawTitle) continue;

      const canonicalKey = normalizeSearchText(rawTitle);
      const watchedAt = parseDate(row["Date"]);
      const existing = groups.get(canonicalKey);
      if (existing) {
        existing.watchedAt = earlierDate(existing.watchedAt, watchedAt);
      } else {
        groups.set(canonicalKey, { rawTitle, yearHint: parseYear(row["Year"]), watchedAt });
      }
    }
  }

  const diaryBytes = byBaseName.get(DIARY_FILE);
  if (diaryBytes) {
    const csvText = decoder.decode(diaryBytes);
    const { data: rows } = Papa.parse<RawRow>(csvText, { header: true, skipEmptyLines: true });
    for (const row of rows) {
      const rawTitle = row["Name"]?.trim();
      if (!rawTitle) continue;

      const canonicalKey = normalizeSearchText(rawTitle);
      const watchedAt = parseDate(row["Watched Date"] ?? row["Date"]);
      const yearHint = parseYear(row["Year"]);
      const existing = groups.get(canonicalKey);
      if (existing) {
        existing.watchedAt = earlierDate(existing.watchedAt, watchedAt);
        if (yearHint && !existing.yearHint) existing.yearHint = yearHint;
      } else {
        groups.set(canonicalKey, { rawTitle, yearHint, watchedAt });
      }
    }
  }

  if (groups.size === 0) {
    throw new LetterboxdExportError("Nenhum filme encontrado no arquivo.");
  }

  return [...groups.values()].map((group) => ({
    rawTitle: group.rawTitle,
    canonicalKey: normalizeSearchText(group.rawTitle),
    mediaType: "movie" as const,
    yearHint: group.yearHint,
    episodes: [],
    movieWatchedAt: group.watchedAt,
  }));
}
