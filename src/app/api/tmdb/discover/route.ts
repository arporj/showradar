import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  discoverMovie,
  discoverTv,
  FRANCHISE_FACETS,
  GENRE_FACETS,
  type TmdbSearchResponse,
} from "@/lib/tmdb";
import { annotateResults } from "@/lib/tmdb-annotate";
import { normalizeSearchText as normalize } from "@/lib/utils";

type Facet = "genre" | "franchise";
type MediaFilter = "all" | "movie" | "tv";

function isFacet(value: string | null): value is Facet {
  return value === "genre" || value === "franchise";
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const facetParam = req.nextUrl.searchParams.get("facet");
  const idx = Number(req.nextUrl.searchParams.get("idx"));
  if (!isFacet(facetParam) || !Number.isInteger(idx)) {
    return NextResponse.json({ error: "invalid_facet" }, { status: 400 });
  }

  const typeParam = req.nextUrl.searchParams.get("type");
  const type: MediaFilter = typeParam === "movie" || typeParam === "tv" ? typeParam : "all";
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);

  let moviePromise: Promise<TmdbSearchResponse> | null = null;
  let tvPromise: Promise<TmdbSearchResponse> | null = null;

  if (facetParam === "genre") {
    const genre = GENRE_FACETS[idx];
    if (!genre) return NextResponse.json({ error: "invalid_facet" }, { status: 400 });
    if (type !== "tv") moviePromise = discoverMovie(page, { genreIds: genre.movieGenreIds });
    // Not every movie genre has a TV equivalent (e.g. Terror, Romance, Thriller) — see GENRE_FACETS.
    if (type !== "movie" && genre.tvGenreId) tvPromise = discoverTv(page, { genreIds: String(genre.tvGenreId) });
  } else {
    const franchise = FRANCHISE_FACETS[idx];
    if (!franchise) return NextResponse.json({ error: "invalid_facet" }, { status: 400 });
    if (type !== "tv") moviePromise = discoverMovie(page, { companyId: franchise.companyId });
    if (type !== "movie") tvPromise = discoverTv(page, { companyId: franchise.companyId });
  }

  try {
    const [movieData, tvData] = await Promise.all([moviePromise, tvPromise]);

    const merged = [...(movieData?.results ?? []), ...(tvData?.results ?? [])].sort(
      (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0),
    );

    const filtered = q ? merged.filter((r) => normalize(r.title ?? r.name ?? "").includes(normalize(q))) : merged;

    // Approximate: based on TMDb's own page count, not the post-filter count —
    // same tradeoff the text-search route makes. "Load more" may return fewer
    // filtered items on a given page, but stays available until TMDb runs dry.
    const hasMore = (movieData ? page < movieData.total_pages : false) || (tvData ? page < tvData.total_pages : false);

    const annotated = await annotateResults(filtered, session.user.id);

    return NextResponse.json({ results: annotated, hasMore });
  } catch {
    return NextResponse.json({ error: "tmdb_unavailable" }, { status: 502 });
  }
}
