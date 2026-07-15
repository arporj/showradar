import { generateSpellingVariants } from "./fuzzy-query";

const API_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";
const DEFAULT_LANGUAGE = "pt-BR";

export class TmdbError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "TmdbError";
  }
}

function accessToken() {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) throw new TmdbError("TMDB_ACCESS_TOKEN is not set");
  return token;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("language", DEFAULT_LANGUAGE);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken()}`,
          Accept: "application/json",
        },
        // Metadata changes rarely enough that a short cache is safe and cuts
        // down on repeat calls during a single search/detail session.
        next: { revalidate: 60 * 60 },
      });

      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get("retry-after")) || 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      if (!res.ok) {
        throw new TmdbError(`TMDb request failed: ${res.status} ${path}`, res.status);
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      if (err instanceof TmdbError) throw err;
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500));
    }
  }
  throw lastError instanceof Error ? lastError : new TmdbError("TMDb request failed after retries");
}

export type TmdbMediaType = "movie" | "tv";

export interface TmdbSearchResult {
  id: number;
  media_type: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  profile_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  known_for_department?: string;
  popularity?: number;
  genre_ids?: number[];
  /** Not from TMDb — annotated by our own /api/tmdb/search route. */
  inLibrary?: boolean;
  numberOfSeasons?: number;
}

export interface TmdbSearchResponse {
  page: number;
  results: TmdbSearchResult[];
  total_pages: number;
  total_results: number;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
  order?: number;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbEpisodeRef {
  id: number;
  name: string;
  season_number: number;
  episode_number: number;
  air_date: string | null;
}

export interface TmdbSeasonRef {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  poster_path: string | null;
  episode_count: number;
}

export interface TmdbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
}

export interface TmdbWatchProviderRegion {
  link: string;
  flatrate?: TmdbWatchProvider[];
  free?: TmdbWatchProvider[];
  ads?: TmdbWatchProvider[];
  rent?: TmdbWatchProvider[];
  buy?: TmdbWatchProvider[];
}

export interface TmdbWatchProviders {
  results: Record<string, TmdbWatchProviderRegion>;
}

export interface TmdbMovieDetail {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  runtime: number | null;
  genres: TmdbGenre[];
  vote_average: number;
  popularity: number;
  status: string;
  credits?: { cast: TmdbCastMember[] };
  "watch/providers"?: TmdbWatchProviders;
}

export interface TmdbTvDetail {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string | null;
  episode_run_time: number[];
  genres: TmdbGenre[];
  vote_average: number;
  popularity: number;
  status: string;
  in_production: boolean;
  origin_country: string[];
  seasons: TmdbSeasonRef[];
  next_episode_to_air: TmdbEpisodeRef | null;
  last_episode_to_air: TmdbEpisodeRef | null;
  credits?: { cast: TmdbCastMember[] };
  "watch/providers"?: TmdbWatchProviders;
}

export interface TmdbSeasonDetail {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  poster_path: string | null;
  episodes: {
    id: number;
    episode_number: number;
    name: string;
    overview: string;
    air_date: string | null;
    runtime: number | null;
    still_path: string | null;
  }[];
}

export interface TmdbPersonDetail {
  id: number;
  name: string;
  biography: string;
  profile_path: string | null;
  birthday: string | null;
  place_of_birth: string | null;
  known_for_department: string;
  combined_credits?: {
    cast: (TmdbSearchResult & { character?: string })[];
  };
}

export async function searchMulti(query: string, page = 1) {
  return tmdbFetch<TmdbSearchResponse>("/search/multi", {
    query,
    page: String(page),
    include_adult: "false",
  });
}

// /search/movie, /search/tv and /search/person don't include media_type in
// their results (only /search/multi does, since it needs to disambiguate a
// mixed list) — stamp it manually so the rest of the pipeline (SearchResultCard,
// the ${media_type}-${id} dedup keys) works the same regardless of source.
async function searchByType(
  path: "/search/movie" | "/search/tv" | "/search/person",
  mediaType: "movie" | "tv" | "person",
  query: string,
  page = 1,
) {
  const data = await tmdbFetch<TmdbSearchResponse>(path, {
    query,
    page: String(page),
    include_adult: "false",
  });
  return { ...data, results: data.results.map((r) => ({ ...r, media_type: mediaType })) };
}

export function searchMovie(query: string, page = 1) {
  return searchByType("/search/movie", "movie", query, page);
}

export function searchTv(query: string, page = 1) {
  return searchByType("/search/tv", "tv", query, page);
}

export function searchPerson(query: string, page = 1) {
  return searchByType("/search/person", "person", query, page);
}

// /discover/movie and /discover/tv, like /search/movie and /search/tv, don't
// stamp media_type on their results — reuse the same "tag it manually" shape
// as searchByType so downstream code (dedup keys, SearchResultCard) is agnostic
// to whether a result came from search or discover.
async function discoverByType(
  mediaType: "movie" | "tv",
  genreIds: string | undefined,
  companyId: number | undefined,
  page: number,
) {
  const params: Record<string, string> = { page: String(page), sort_by: "popularity.desc", include_adult: "false" };
  if (genreIds) params.with_genres = genreIds;
  if (companyId) params.with_companies = String(companyId);
  const data = await tmdbFetch<TmdbSearchResponse>(`/discover/${mediaType}`, params);
  return { ...data, results: data.results.map((r) => ({ ...r, media_type: mediaType })) };
}

export function discoverMovie(page: number, opts: { genreIds?: string; companyId?: number }) {
  return discoverByType("movie", opts.genreIds, opts.companyId, page);
}

export function discoverTv(page: number, opts: { genreIds?: string; companyId?: number }) {
  return discoverByType("tv", opts.genreIds, opts.companyId, page);
}

/**
 * Curated genre facet for the search combo. TMDb keeps separate (and
 * differently-shaped) genre taxonomies for movies and TV — e.g. TV has no
 * "Terror"/"Romance"/"Thriller" bucket, and merges Action+Adventure and
 * Fantasy+Sci-Fi into single categories. Each entry maps to the movie
 * genre id(s) (comma = AND, pipe = OR in TMDb's `with_genres`) and, where a
 * reasonable TV equivalent exists, the TV genre id. IDs are stable across
 * TMDb and pt-BR labels were confirmed against /genre/{movie,tv}/list.
 */
export const GENRE_FACETS = [
  { label: "Ação e aventura", movieGenreIds: "28,12", tvGenreId: 10759 },
  { label: "Animação", movieGenreIds: "16", tvGenreId: 16 },
  { label: "Comédia", movieGenreIds: "35", tvGenreId: 35 },
  { label: "Crime", movieGenreIds: "80", tvGenreId: 80 },
  { label: "Documentário", movieGenreIds: "99", tvGenreId: 99 },
  { label: "Drama", movieGenreIds: "18", tvGenreId: 18 },
  { label: "Família", movieGenreIds: "10751", tvGenreId: 10751 },
  { label: "Ficção científica e fantasia", movieGenreIds: "878,14", tvGenreId: 10765 },
  { label: "Guerra", movieGenreIds: "10752", tvGenreId: 10768 },
  { label: "Mistério", movieGenreIds: "9648", tvGenreId: 9648 },
  { label: "Terror", movieGenreIds: "27", tvGenreId: undefined },
  { label: "Romance", movieGenreIds: "10749", tvGenreId: undefined },
  { label: "Thriller", movieGenreIds: "53", tvGenreId: undefined },
  { label: "Faroeste", movieGenreIds: "37", tvGenreId: 37 },
] as const satisfies readonly { label: string; movieGenreIds: string; tvGenreId: number | undefined }[];

/**
 * TMDb genre id → pt-BR name, merging the movie and TV taxonomies (ids don't
 * collide between them except where the genre is literally the same). Used to
 * render the `genre_ids` that come with search/discover results without an
 * extra /genre lookup per request — both lists are static on TMDb's side.
 */
export const TMDB_GENRE_NAMES: Record<number, string> = {
  // Filmes
  28: "Ação",
  12: "Aventura",
  16: "Animação",
  35: "Comédia",
  80: "Crime",
  99: "Documentário",
  18: "Drama",
  10751: "Família",
  14: "Fantasia",
  36: "História",
  27: "Terror",
  10402: "Música",
  9648: "Mistério",
  10749: "Romance",
  878: "Ficção científica",
  10770: "Cinema TV",
  53: "Thriller",
  10752: "Guerra",
  37: "Faroeste",
  // Séries (ids exclusivos da taxonomia de TV)
  10759: "Ação e aventura",
  10762: "Infantil",
  10763: "Notícias",
  10764: "Reality",
  10765: "Ficção científica e fantasia",
  10766: "Novela",
  10767: "Talk show",
  10768: "Guerra e política",
};

/**
 * Curated franchise/studio shortcuts, keyed by TMDb company id (looked up via
 * /search/company). There's no generic "franchise" facet in TMDb like there is
 * for genre, so this list is hand-picked rather than fetched.
 */
export const FRANCHISE_FACETS = [
  { label: "Marvel", companyId: 420 },
  { label: "Star Wars", companyId: 1 },
  { label: "Pixar", companyId: 3 },
  { label: "DC", companyId: 429 },
  { label: "Studio Ghibli", companyId: 10342 },
  { label: "DreamWorks Animation", companyId: 521 },
] as const satisfies readonly { label: string; companyId: number }[];

// Below this popularity, the best match is likely noise (an obscure exact-ish
// spelling match) rather than what the user actually meant.
const FUZZY_FALLBACK_POPULARITY_THRESHOLD = 5;

/**
 * Wraps a page-1 search: if results are empty or all low-popularity, retries
 * with spelling variants (see fuzzy-query.ts) and merges in anything new they
 * find. TMDb itself does no typo correction, so this is the layer that lets
 * e.g. "stalone" surface Sylvester Stallone. Only ever applied to page 1 —
 * deeper pages just use the plain search function directly.
 */
async function withFuzzyFallback(
  searchFn: (query: string, page?: number) => Promise<TmdbSearchResponse>,
  query: string,
  isRelevant: (r: TmdbSearchResult) => boolean = () => true,
) {
  const primary = await searchFn(query, 1);
  const relevant = primary.results.filter(isRelevant);
  const maxPopularity = relevant.reduce((max, r) => Math.max(max, r.popularity ?? 0), 0);
  if (relevant.length > 0 && maxPopularity >= FUZZY_FALLBACK_POPULARITY_THRESHOLD) {
    return primary;
  }

  const variants = generateSpellingVariants(query);
  const extraResponses = await Promise.all(variants.map((v) => searchFn(v, 1).catch(() => null)));

  const merged = new Map<string, TmdbSearchResult>();
  for (const r of primary.results) merged.set(`${r.media_type}-${r.id}`, r);
  for (const response of extraResponses) {
    if (!response) continue;
    for (const r of response.results) merged.set(`${r.media_type}-${r.id}`, r);
  }

  return { ...primary, results: [...merged.values()] };
}

const isSearchableType = (r: TmdbSearchResult) =>
  r.media_type === "movie" || r.media_type === "tv" || r.media_type === "person";

export function searchMultiFuzzy(query: string) {
  return withFuzzyFallback(searchMulti, query, isSearchableType);
}

export function searchMovieFuzzy(query: string) {
  return withFuzzyFallback(searchMovie, query);
}

export function searchTvFuzzy(query: string) {
  return withFuzzyFallback(searchTv, query);
}

export function searchPersonFuzzy(query: string) {
  return withFuzzyFallback(searchPerson, query);
}

// TMDb's /recommendations is collaborative-filtering based and returns
// nothing for less-popular titles; /similar (content-based, genres/keywords)
// almost always has something. Falling back keeps the "recomendados" widget
// from going empty just because a user's watch history skews niche.
export async function getTitleRecommendations(mediaType: TmdbMediaType, tmdbId: number) {
  const base = mediaType === "movie" ? "/movie" : "/tv";
  const primary = await tmdbFetch<TmdbSearchResponse>(`${base}/${tmdbId}/recommendations`, { page: "1" });
  const data = primary.results.length > 0 ? primary : await tmdbFetch<TmdbSearchResponse>(`${base}/${tmdbId}/similar`, { page: "1" });
  return data.results.map((r) => ({ ...r, media_type: mediaType }));
}

export async function getMovieDetail(id: number) {
  return tmdbFetch<TmdbMovieDetail>(`/movie/${id}`, {
    append_to_response: "credits,external_ids,videos,watch/providers",
  });
}

export async function getTvDetail(id: number) {
  return tmdbFetch<TmdbTvDetail>(`/tv/${id}`, {
    append_to_response: "credits,external_ids,videos,watch/providers",
  });
}

export async function getTvSeason(tvId: number, seasonNumber: number) {
  return tmdbFetch<TmdbSeasonDetail>(`/tv/${tvId}/season/${seasonNumber}`);
}

export async function getPersonDetail(id: number) {
  return tmdbFetch<TmdbPersonDetail>(`/person/${id}`, {
    append_to_response: "combined_credits",
  });
}

export function tmdbImageUrl(path: string | null | undefined, size: string) {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}
