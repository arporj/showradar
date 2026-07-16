"use client";

import { useOptimistic, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/title/rating-stars";
import { deleteEpisodeRating, submitEpisodeRating } from "@/lib/actions/episode-ratings";

export function EpisodeRatingForm({
  episodeId,
  tmdbTvId,
  seasonNumber,
  episodeNumber,
  initialRating,
}: {
  episodeId: string;
  tmdbTvId: number;
  seasonNumber: number;
  episodeNumber: number;
  initialRating: number | null;
}) {
  const [optimisticRating, setOptimisticRating] = useOptimistic(
    initialRating,
    (_state: number | null, next: number | null) => next,
  );
  const [isPending, startTransition] = useTransition();

  function handleChange(value: number) {
    startTransition(async () => {
      setOptimisticRating(value);
      await submitEpisodeRating({ episodeId, tmdbTvId, seasonNumber, episodeNumber, rating: value });
    });
  }

  function handleDelete() {
    startTransition(async () => {
      setOptimisticRating(null);
      await deleteEpisodeRating({ episodeId, tmdbTvId, seasonNumber, episodeNumber });
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Sua avaliação</p>
      <div className="flex items-center gap-2">
        <RatingStars value={optimisticRating ?? 0} onChange={handleChange} />
        {optimisticRating != null && (
          <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleDelete}>
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}
