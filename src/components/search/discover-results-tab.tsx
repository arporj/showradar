"use client";

import { Info } from "lucide-react";

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
      {results.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            <span className="font-semibold">Lista limitada:</span> mostramos os títulos mais populares{" "}
            {facet === "genre" ? "deste gênero" : "desta franquia"}, em ordem de popularidade — nem tudo aparece
            aqui. Para encontrar um título específico, troque a busca para <span className="font-semibold">Nome</span>.
          </p>
        </div>
      )}
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
