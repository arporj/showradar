"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { removeTitleFromList } from "@/lib/actions/lists";
import type { TmdbMediaType } from "@/lib/tmdb";

export function RemoveFromListButton({
  listId,
  titleId,
  mediaType,
  tmdbId,
}: {
  listId: string;
  titleId: string;
  mediaType: TmdbMediaType;
  tmdbId: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRemove(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    startTransition(async () => {
      await removeTitleFromList(listId, titleId, mediaType, tmdbId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={isPending}
      aria-label="Remover da lista"
      className="absolute top-1.5 right-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
    >
      <X className="size-3.5" />
    </button>
  );
}
