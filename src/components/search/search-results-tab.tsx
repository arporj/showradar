"use client";

import { SearchResultCard } from "@/components/search/result-card";
import { SearchResultCardSkeleton } from "@/components/search/result-card-skeleton";
import { Button } from "@/components/ui/button";
import { usePaginatedSearch } from "@/hooks/use-paginated-search";
import type { TmdbSearchResult } from "@/lib/tmdb";

export function SearchResultsTab({
  type,
  query,
  active,
}: {
  type: "all" | "movie" | "tv" | "person";
  query: string;
  active: boolean;
}) {
  const { results, isLoading, error, hasMore, loadMore } = usePaginatedSearch<TmdbSearchResult>({
    endpoint: `/api/tmdb/search?type=${type}`,
    query,
    active,
  });

  return (
    <div className="space-y-3">
      {isLoading &&
        results.length === 0 &&
        Array.from({ length: 4 }).map((_, i) => <SearchResultCardSkeleton key={i} />)}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!isLoading && !error && results.length === 0 && (
        <p className="text-sm text-muted-foreground">Nada encontrado para &quot;{query}&quot;.</p>
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
