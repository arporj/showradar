"use client";

import { useEffect, useState } from "react";

export interface SearchCounts {
  movie: number | null;
  tv: number | null;
  person: number | null;
  user: number | null;
}

/**
 * One-shot fetch of result counts per category, independent of which search
 * tab is active — the whole point is to label tabs the user hasn't clicked
 * yet, so unlike usePaginatedSearch this can't be lazy per-tab.
 */
export function useSearchCounts(query: string, minLength = 2) {
  const [counts, setCounts] = useState<SearchCounts | null>(null);

  // Reset during render (not in an effect) when the query changes — same
  // pattern as usePaginatedSearch, avoids a stale count flashing before the
  // fetch effect below has a chance to run.
  const [queryAtLastReset, setQueryAtLastReset] = useState(query);
  if (query !== queryAtLastReset) {
    setQueryAtLastReset(query);
    setCounts(null);
  }

  useEffect(() => {
    if (query.length < minLength) return;

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/search-counts?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as SearchCounts;
        setCounts(data);
      } catch {
        // A failed count fetch just means tabs render without numbers.
      }
    })();

    return () => controller.abort();
  }, [query, minLength]);

  return counts;
}
