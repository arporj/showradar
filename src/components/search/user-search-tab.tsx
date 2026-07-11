"use client";

import { UserResultCard } from "@/components/search/user-result-card";
import { UserResultCardSkeleton } from "@/components/search/user-result-card-skeleton";
import { Button } from "@/components/ui/button";
import { usePaginatedSearch } from "@/hooks/use-paginated-search";
import type { UserSearchResult } from "@/lib/user-search";

export function UserSearchTab({ query, active }: { query: string; active: boolean }) {
  const { results, isLoading, error, hasMore, loadMore } = usePaginatedSearch<UserSearchResult>({
    endpoint: "/api/users/search",
    query,
    active,
  });

  return (
    <div className="space-y-3">
      {isLoading &&
        results.length === 0 &&
        Array.from({ length: 4 }).map((_, i) => <UserResultCardSkeleton key={i} />)}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!isLoading && !error && results.length === 0 && (
        <p className="text-sm text-muted-foreground">Nada encontrado para &quot;{query}&quot;.</p>
      )}

      {results.map((result) => (
        <UserResultCard key={result.id} result={result} />
      ))}

      {hasMore && (
        <Button variant="outline" className="w-full" onClick={loadMore} disabled={isLoading}>
          {isLoading ? "Carregando..." : "Exibir mais"}
        </Button>
      )}
    </div>
  );
}
