"use client";

import { useOptimistic, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addExistingTitleToLibrary, removeFromLibrary, updateLibraryStatus } from "@/lib/actions/library";
import { LIBRARY_STATUS_LABEL, type LibraryStatus } from "@/lib/library-status";

// Movies have no episode-level signal to derive status from, so all four
// stay manual and always visible, in a fixed order.
const MOVIE_STATUS_BUTTONS: LibraryStatus[] = ["plan_to_watch", "watching", "completed", "dropped"];

export function LibraryStatusControl({
  titleId,
  currentStatus,
  mediaType,
}: {
  titleId: string;
  currentStatus: LibraryStatus | null;
  mediaType: "movie" | "tv";
}) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    currentStatus,
    (_state: LibraryStatus | null, next: LibraryStatus | null) => next,
  );
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      setOptimisticStatus("plan_to_watch");
      await addExistingTitleToLibrary(titleId);
    });
  }

  function handleChangeStatus(status: LibraryStatus) {
    startTransition(async () => {
      setOptimisticStatus(status);
      await updateLibraryStatus(titleId, status);
    });
  }

  function handleRemove() {
    startTransition(async () => {
      setOptimisticStatus(null);
      await removeFromLibrary(titleId);
    });
  }

  if (!optimisticStatus) {
    return (
      <Button type="button" onClick={handleAdd} disabled={isPending}>
        {isPending ? "Adicionando..." : "Adicionar à grade"}
      </Button>
    );
  }

  // For TV shows, "Assistindo"/"Assistido" are derived automatically from
  // episode progress (see syncLibraryStatusFromProgress in lib/actions/episodes.ts).
  // "Quero assistir" only makes sense as a manual action once the show has
  // been dropped — it's the one way back. Showing it while already
  // watching/completed/plan_to_watch would be redundant or nonsensical, so
  // exactly one of the two toggle buttons is visible at a time.
  const statusButtons: LibraryStatus[] =
    mediaType === "tv" ? (optimisticStatus === "dropped" ? ["plan_to_watch"] : ["dropped"]) : MOVIE_STATUS_BUTTONS;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>{LIBRARY_STATUS_LABEL[optimisticStatus]}</Badge>
      {statusButtons.map((status) => (
        <Button
          key={status}
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => handleChangeStatus(status)}
        >
          {LIBRARY_STATUS_LABEL[status]}
        </Button>
      ))}
      <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleRemove}>
        Remover
      </Button>
    </div>
  );
}
