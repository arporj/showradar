"use client";

import { useOptimistic, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/title/rating-stars";
import { withTimeout } from "@/lib/with-timeout";

// Shared by the title page and the episode page — neither the value nor the
// delete action care which entity is being rated, that's baked into the
// callbacks the caller closes over (submitRating/submitEpisodeRating etc.).
export function RatingForm({
  initialRating,
  onChange,
  onDelete,
  label = "Sua avaliação",
}: {
  initialRating: number | null;
  onChange: (rating: number) => Promise<void>;
  onDelete: () => Promise<void>;
  label?: string;
}) {
  const [optimisticRating, setOptimisticRating] = useOptimistic(
    initialRating,
    (_state: number | null, next: number | null) => next,
  );
  // useTransition's own isPending has been observed to stay stuck at true
  // even after the transition callback fully returns (seen against this
  // Next/React canary pairing) — tracked independently here instead of
  // trusting it, with withTimeout as a backstop against a hung/aborted call.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  function handleChange(value: number) {
    setIsSubmitting(true);
    startTransition(() => {
      setOptimisticRating(value);
    });
    (async () => {
      try {
        await withTimeout(onChange(value));
      } catch (error) {
        console.error("Failed to submit rating", error);
      } finally {
        setIsSubmitting(false);
      }
    })();
  }

  function handleDelete() {
    setIsSubmitting(true);
    startTransition(() => {
      setOptimisticRating(null);
    });
    (async () => {
      try {
        await withTimeout(onDelete());
      } catch (error) {
        console.error("Failed to delete rating", error);
      } finally {
        setIsSubmitting(false);
      }
    })();
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <RatingStars value={optimisticRating ?? 0} onChange={handleChange} disabled={isSubmitting} />
        {optimisticRating != null && !isSubmitting && (
          <Button type="button" variant="ghost" size="sm" onClick={handleDelete}>
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}
