"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { addTitleToLibrary } from "@/lib/actions/library";
import type { TmdbMediaType } from "@/lib/tmdb";

export function AddToLibraryButton({
  mediaType,
  tmdbId,
  initiallyAdded,
}: {
  mediaType: TmdbMediaType;
  tmdbId: number;
  initiallyAdded: boolean;
}) {
  const [added, setAdded] = useState(initiallyAdded);
  const [isPending, startTransition] = useTransition();

  if (added) {
    return (
      <Button type="button" size="sm" variant="secondary" disabled>
        Adicionado
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await addTitleToLibrary(mediaType, tmdbId);
          setAdded(true);
        });
      }}
    >
      {isPending ? "Adicionando..." : "Adicionar à grade"}
    </Button>
  );
}
