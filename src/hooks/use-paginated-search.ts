"use client";

import { useEffect, useState } from "react";

interface PaginatedResponse<T> {
  results: T[];
  hasMore: boolean;
}

interface UsePaginatedSearchOptions {
  /** Endpoint path, optionally with fixed query params already attached (e.g. "/api/tmdb/search?type=movie"). */
  endpoint: string;
  query: string;
  /** Only the active tab fetches; switching tabs later resumes/fetches lazily. */
  active: boolean;
  minLength?: number;
}

function buildUrl(endpoint: string, query: string, page: number) {
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}q=${encodeURIComponent(query)}&page=${page}`;
}

/**
 * Fetches one page of results per call, only for the active tab, and caches
 * per query string so switching tabs back and forth doesn't refetch. "Load
 * more" always issues a real new request for the next page (no client-side
 * reveal-from-cache) — see the search API's own half-page pagination scheme.
 */
export function usePaginatedSearch<T>({ endpoint, query, active, minLength = 2 }: UsePaginatedSearchOptions) {
  const [results, setResults] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetchedCurrentQuery, setHasFetchedCurrentQuery] = useState(false);

  // Reset during render (not in an effect) when the query changes, following
  // React's "adjusting state when a prop changes" pattern — avoids an extra
  // render pass just to clear stale results before the new fetch effect runs.
  const [queryAtLastReset, setQueryAtLastReset] = useState(query);
  if (query !== queryAtLastReset) {
    setQueryAtLastReset(query);
    setResults([]);
    setPage(1);
    setHasMore(false);
    setError(null);
    setHasFetchedCurrentQuery(false);
  }

  useEffect(() => {
    if (!active || query.length < minLength || hasFetchedCurrentQuery) return;

    const controller = new AbortController();
    let isCurrent = true;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(buildUrl(endpoint, query, 1), { signal: controller.signal });
        if (!res.ok) throw new Error("search_failed");
        const data = (await res.json()) as PaginatedResponse<T>;
        if (!isCurrent) return;
        setHasFetchedCurrentQuery(true);
        setResults(data.results ?? []);
        setHasMore(!!data.hasMore);
        setPage(1);
      } catch (err) {
        if (isCurrent && (err as Error).name !== "AbortError") {
          setError("Não foi possível buscar agora. Tente de novo em instantes.");
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    })();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [active, query, minLength, endpoint, hasFetchedCurrentQuery]);

  const loadMore = () => {
    if (isLoading || !hasMore) return;
    const nextPage = page + 1;
    setIsLoading(true);
    setError(null);

    fetch(buildUrl(endpoint, query, nextPage))
      .then((res) => {
        if (!res.ok) throw new Error("search_failed");
        return res.json() as Promise<PaginatedResponse<T>>;
      })
      .then((data) => {
        setResults((prev) => [...prev, ...(data.results ?? [])]);
        setHasMore(!!data.hasMore);
        setPage(nextPage);
      })
      .catch(() => setError("Não foi possível buscar mais resultados agora."))
      .finally(() => setIsLoading(false));
  };

  return { results, isLoading, error, hasMore, loadMore };
}
