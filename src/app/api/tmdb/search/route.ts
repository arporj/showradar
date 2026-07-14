import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  searchMovie,
  searchMovieFuzzy,
  searchMulti,
  searchMultiFuzzy,
  searchPerson,
  searchPersonFuzzy,
  searchTv,
  searchTvFuzzy,
  type TmdbSearchResponse,
} from "@/lib/tmdb";
import { annotateResults } from "@/lib/tmdb-annotate";

type SearchType = "all" | "movie" | "tv" | "person";

const FUZZY_SEARCH_FNS = {
  all: searchMultiFuzzy,
  movie: searchMovieFuzzy,
  tv: searchTvFuzzy,
  person: searchPersonFuzzy,
} satisfies Record<SearchType, (query: string) => Promise<TmdbSearchResponse>>;

const PLAIN_SEARCH_FNS = {
  all: searchMulti,
  movie: searchMovie,
  tv: searchTv,
  person: searchPerson,
} satisfies Record<SearchType, (query: string, page: number) => Promise<TmdbSearchResponse>>;

function isSearchType(value: string | null): value is SearchType {
  return value === "all" || value === "movie" || value === "tv" || value === "person";
}

// Our page size is 10, TMDb's is 20 — our pages N and N+1 (an odd/even pair)
// both come from the same TMDb page, split in half. tmdbFetch's hourly
// revalidate means fetching that same TMDb page twice hits Next's fetch cache
// instead of a second real TMDb call.
function toTmdbPage(ourPage: number) {
  return {
    tmdbPage: Math.ceil(ourPage / 2),
    half: ourPage % 2 === 1 ? ("first" as const) : ("second" as const),
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], hasMore: false });
  }

  const typeParam = req.nextUrl.searchParams.get("type");
  const type: SearchType = isSearchType(typeParam) ? typeParam : "all";
  const ourPage = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const { tmdbPage, half } = toTmdbPage(ourPage);

  try {
    // The spelling-variant fallback only ever looks at TMDb's own page 1, so it
    // only runs for our first two pages (which both slice that same page 1).
    const data = tmdbPage === 1 ? await FUZZY_SEARCH_FNS[type](query) : await PLAIN_SEARCH_FNS[type](query, tmdbPage);

    const sorted = data.results
      .filter((r) => r.media_type === "movie" || r.media_type === "tv" || r.media_type === "person")
      // TMDb orders matches by text relevance only, so obscure exact-spelling
      // matches can outrank a far more likely (but slightly misspelled) famous
      // result. Re-rank by popularity to surface what the user probably meant.
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

    const start = half === "first" ? 0 : 10;
    const end = start + 10;
    const results = sorted.slice(start, end);
    const hasMore = sorted.length > end || tmdbPage < data.total_pages;

    const annotated = await annotateResults(results, session.user.id);

    return NextResponse.json({ results: annotated, hasMore });
  } catch {
    return NextResponse.json({ error: "tmdb_unavailable" }, { status: 502 });
  }
}
