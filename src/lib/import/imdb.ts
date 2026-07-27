import Papa from "papaparse";

import { normalizeSearchText } from "@/lib/utils";

import type { ParsedImportItem } from "./types";

export class ImdbExportError extends Error {}

interface RawRow {
  [key: string]: string | undefined;
}

// IMDb's "Your Ratings" export (Const, Your Rating, Date Rated, Title, Title
// Type, Year, ...) is the only history IMDb exposes — no per-episode watch
// dates like TV Time gives. tvEpisode rows are skipped on purpose: the CSV
// has no season/episode number or parent series title, so there's no
// reliable way to attach an episode rating back to a show.
const MOVIE_TITLE_TYPES = new Set(["movie", "tvMovie", "short", "video", "tvSpecial"]);
const TV_TITLE_TYPES = new Set(["tvSeries", "tvMiniSeries"]);

function parseDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Parses an IMDb "Your Ratings" CSV export into one item per rated
 * movie/show. Pure and network-free, same contract as parseTvTimeExport —
 * TMDb matching happens later in processImportBatch.
 */
export function parseImdbExport(csvText: string): ParsedImportItem[] {
  // Excel-exported CSVs commonly carry a leading BOM, which would otherwise
  // land inside the first header's key and break the "Const" check below.
  const cleanText = csvText.replace(/^﻿/, "").trim();
  const { data: rows, meta } = Papa.parse<RawRow>(cleanText, { header: true, skipEmptyLines: true });

  const headers = meta.fields ?? [];
  if (!headers.includes("Const") || !headers.includes("Title") || !headers.includes("Title Type")) {
    throw new ImdbExportError("Arquivo não parece ser um export de avaliações do IMDb.");
  }

  const items = new Map<string, ParsedImportItem>();

  for (const row of rows) {
    const rawTitle = row["Title"]?.trim();
    const titleType = row["Title Type"]?.trim();
    if (!rawTitle || !titleType) continue;

    let mediaType: "movie" | "tv";
    if (MOVIE_TITLE_TYPES.has(titleType)) mediaType = "movie";
    else if (TV_TITLE_TYPES.has(titleType)) mediaType = "tv";
    else continue; // tvEpisode, videoGame, musicVideo, etc. — not importable

    const canonicalKey = normalizeSearchText(rawTitle);
    const key = `${mediaType}:${canonicalKey}`;
    if (items.has(key)) continue; // IMDb only allows one rating per title

    const yearMatch = row["Year"]?.match(/\d{4}/);

    items.set(key, {
      rawTitle,
      canonicalKey,
      mediaType,
      yearHint: yearMatch ? Number(yearMatch[0]) : null,
      episodes: [],
      movieWatchedAt: mediaType === "movie" ? parseDate(row["Date Rated"]) : null,
    });
  }

  if (items.size === 0) {
    throw new ImdbExportError("Nenhum filme ou série encontrado no arquivo.");
  }

  return [...items.values()];
}
