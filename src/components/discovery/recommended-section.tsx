"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { SearchResultCard } from "@/components/search/result-card";
import { Button } from "@/components/ui/button";
import { dismissRecommendation } from "@/lib/actions/discovery";
import type { TmdbMediaType, TmdbSearchResult } from "@/lib/tmdb";

export function RecommendedSection({ initialRecommended }: { initialRecommended: TmdbSearchResult[] }) {
  const [recommended, setRecommended] = useState(initialRecommended);
  const [, startTransition] = useTransition();

  if (recommended.length === 0) return null;

  // getTitleRecommendations (lib/tmdb.ts) always tags results with the
  // source title's own media type, so this showcase never contains people.
  function dismiss(result: TmdbSearchResult) {
    setRecommended((current) => current.filter((item) => item.id !== result.id || item.media_type !== result.media_type));
    startTransition(() => {
      dismissRecommendation(result.media_type as TmdbMediaType, result.id);
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Recomendados para você</h2>
      <div className="space-y-3">
        {recommended.map((result) => (
          <SearchResultCard
            key={`${result.media_type}-${result.id}`}
            result={result}
            action={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                aria-label="Não recomendar esse título novamente"
                onClick={() => dismiss(result)}
              >
                <Trash2 />
              </Button>
            }
          />
        ))}
      </div>
    </section>
  );
}
