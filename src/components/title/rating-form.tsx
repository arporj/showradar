"use client";

import { useOptimistic, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "@/components/title/rating-stars";
import { deleteRating, submitRating } from "@/lib/actions/ratings";
import type { TmdbMediaType } from "@/lib/tmdb";

export function RatingForm({
  titleId,
  mediaType,
  tmdbId,
  initialRating,
  initialReviewText,
}: {
  titleId: string;
  mediaType: TmdbMediaType;
  tmdbId: number;
  initialRating: number | null;
  initialReviewText: string | null;
}) {
  const [optimisticRating, setOptimisticRating] = useOptimistic(
    initialRating,
    (_state: number | null, next: number | null) => next,
  );
  const [reviewText, setReviewText] = useState(initialReviewText ?? "");
  const [isPending, startTransition] = useTransition();

  function handleRatingChange(value: number) {
    startTransition(async () => {
      setOptimisticRating(value);
      await submitRating(titleId, mediaType, tmdbId, value, reviewText);
    });
  }

  function handleSaveText() {
    if (!optimisticRating) return;
    startTransition(async () => {
      await submitRating(titleId, mediaType, tmdbId, optimisticRating, reviewText);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      setOptimisticRating(null);
      setReviewText("");
      await deleteRating(titleId, mediaType, tmdbId);
    });
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">Sua avaliação</p>
      <RatingStars value={optimisticRating ?? 0} onChange={handleRatingChange} />
      <Textarea
        placeholder="Escreva uma resenha (opcional)"
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        disabled={!optimisticRating || isPending}
      />
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={!optimisticRating || isPending} onClick={handleSaveText}>
          Salvar
        </Button>
        {optimisticRating != null && (
          <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleDelete}>
            Remover avaliação
          </Button>
        )}
      </div>
    </div>
  );
}
