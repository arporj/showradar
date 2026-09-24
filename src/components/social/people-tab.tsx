"use client";

import { useEffect, useState } from "react";

import { UserResultCard } from "@/components/search/user-result-card";
import { UserResultCardSkeleton } from "@/components/search/user-result-card-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePaginatedSearch } from "@/hooks/use-paginated-search";
import type { UserSearchResult } from "@/lib/user-search";

// Lista todo mundo com a busca vazia (minLength 0) e filtra conforme digita —
// mesma rota da aba "Usuários" da busca, que devolve todos quando q vem vazio.
export function PeopleTab() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const { results, isLoading, error, hasMore, loadMore } = usePaginatedSearch<UserSearchResult>({
    endpoint: "/api/users/search",
    query: debouncedQuery,
    active: true,
    minLength: 0,
  });

  return (
    <div className="space-y-3">
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar por nome ou @usuário..." />

      {isLoading && results.length === 0 && Array.from({ length: 4 }).map((_, i) => <UserResultCardSkeleton key={i} />)}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!isLoading && !error && results.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {debouncedQuery ? <>Ninguém encontrado para &quot;{debouncedQuery}&quot;.</> : "Nenhuma outra pessoa por aqui ainda."}
        </p>
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
