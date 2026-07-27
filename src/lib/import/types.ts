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
