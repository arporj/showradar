"use client";

import { SearchResultCard } from "@/components/search/result-card";
import { SearchResultCardSkeleton } from "@/components/search/result-card-skeleton";
import { Button } from "@/components/ui/button";
import { usePaginatedSearch } from "@/hooks/use-paginated-search";
import type { TmdbSearchResult } from "@/lib/tmdb";

export function DiscoverResultsTab({
  facet,
  idx,
  type,
  query,
  active,
}: {
  facet: "genre" | "franchise";
  idx: number;
  type: "all" | "movie" | "tv";
  query: string;
  active: boolean;
}) {
  // minLength: 0 — unlike text search, browsing by genre/franchise doesn't
  // require the user to type anything; the free-text box is just an optional
  // filter on top of the fetched list.
  const { results, isLoading, error, hasMore, loadMore } = usePaginatedSearch<TmdbSearchResult>({
    endpoint: `/api/tmdb/discover?facet=${facet}&idx=${idx}&type=${type}`,
    query,
    active,
    minLength: 0,
  });

  return (
    <div className="space-y-3">
      {isLoading &&
        results.length === 0 &&
        Array.from({ length: 4 }).map((_, i) => <SearchResultCardSkeleton key={i} />)}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!isLoading && !error && results.length === 0 && (
        <p className="text-sm text-muted-foreground">Nada encontrado.</p>
      )}

      {results.map((result) => (
        <SearchResultCard key={`${result.media_type}-${result.id}`} result={result} />
      ))}

      {hasMore && (
        <Button variant="outline" className="w-full" onClick={loadMore} disabled={isLoading}>
          {isLoading ? "Carregando..." : "Exibir mais"}
        </Button>
      )}
    </div>
  );
}
