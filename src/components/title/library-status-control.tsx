"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RateAfterWatchDialog } from "@/components/title/rate-after-watch-dialog";
import { WatchCountControl } from "@/components/title/watch-count-control";
import {
  addExistingTitleToLibrary,
  removeFromLibrary,
  rewatchMovie,
  undoMovieRewatch,
  updateLibraryStatus,
} from "@/lib/actions/library";
import { useSignInRedirect } from "@/hooks/use-sign-in-redirect";
import { LIBRARY_STATUS_LABEL, type LibraryStatus } from "@/lib/library-status";
import { isOffline } from "@/lib/offline/network-status";
import { runOrQueue } from "@/lib/offline/run-or-queue";

// Movies have no episode-level signal to derive status from, so all five
// stay manual and always visible, in a fixed order.
const MOVIE_STATUS_BUTTONS: LibraryStatus[] = ["plan_to_watch", "watching", "on_hold", "completed", "dropped"];

export function LibraryStatusControl({
  titleId,
  tmdbId,
  titleName,
  currentStatus,
  mediaType,
  watchCount,
  onRate,
  signedIn = true,
}: {
  titleId: string;
  tmdbId: number;
  titleName: string;
  currentStatus: LibraryStatus | null;
  mediaType: "movie" | "tv";
  watchCount: number;
  onRate: (rating: number) => Promise<void>;
  signedIn?: boolean;
}) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    currentStatus,
    (_state: LibraryStatus | null, next: LibraryStatus | null) => next,
  );
  const [count, setCount] = useState(watchCount);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const goToSignIn = useSignInRedirect();

  function handleAdd() {
    if (!signedIn) return goToSignIn();
    startTransition(async () => {
      setOptimisticStatus("plan_to_watch");
      await addExistingTitleToLibrary(titleId);
    });
  }

  function handleChangeStatus(status: LibraryStatus) {
    if (!signedIn) return goToSignIn();
    // Mirrors the server-side rule in updateLibraryStatus: a genuine
    // transition into "completed" logs a watch event too, so the counter
    // shown right after clicking "Assistido" isn't stuck at the stale
    // pre-completion count from page load.
    const justWatchedMovie = mediaType === "movie" && status === "completed" && optimisticStatus !== "completed";
    if (justWatchedMovie) {
      setCount((c) => c + 1);
    }
    startTransition(async () => {
      setOptimisticStatus(status);
      await runOrQueue(() => updateLibraryStatus(titleId, status), {
        type: "library-status",
        payload: { titleId, status },
      });
      // updateLibraryStatus doesn't return anything to tell an online write
      // apart from an offline-queued one, unlike the episode actions — so
      // the offline check happens here instead, same effect as gating on a
      // truthy result: skip the prompt when the write hasn't actually
      // landed yet.
      if (justWatchedMovie && !isOffline()) setRatingOpen(true);
    });
  }

  function handleRemove() {
    if (!signedIn) return goToSignIn();
    startTransition(async () => {
      setOptimisticStatus(null);
      await removeFromLibrary(titleId);
    });
  }

  function handleRewatch() {
    if (!signedIn) return goToSignIn();
    setCount((c) => c + 1);
    startTransition(async () => {
      await rewatchMovie(titleId, "movie", tmdbId);
      toast.success("Nova vista registrada");
    });
  }

  function handleUndoRewatch() {
    if (!signedIn) return goToSignIn();
    setCount((c) => Math.max(1, c - 1));
    startTransition(async () => {
      await undoMovieRewatch(titleId, "movie", tmdbId);
    });
  }

  if (!optimisticStatus) {
    return (
      <Button type="button" onClick={handleAdd} disabled={isPending}>
        {!signedIn ? "Entrar para acompanhar" : isPending ? "Adicionando..." : "Adicionar à grade"}
      </Button>
    );
  }

  // For TV shows, "Assistindo"/"Assistido" are derived automatically from
  // episode progress (see syncLibraryStatusFromProgress in lib/actions/episodes.ts).
  // "Quero assistir" only makes sense as a manual action once the show has
  // been dropped — it's the one way back. "Pausado" is the other sticky
  // manual override (see the same syncLibraryStatusFromProgress) — reachable
  // from any active state, with its own way back into "Assistindo" or all
  // the way to "Abandonei".
  //
  // Either way, the current status itself is never offered as a button — a
  // click should always mean "change to something else", never a no-op
  // re-click on the status already shown in the badge above.
  const availableStatuses: LibraryStatus[] =
    mediaType === "tv"
      ? optimisticStatus === "dropped"
        ? ["plan_to_watch"]
        : optimisticStatus === "on_hold"
          ? ["watching", "dropped"]
          : ["dropped", "on_hold"]
      : MOVIE_STATUS_BUTTONS;
  const statusButtons = availableStatuses.filter((status) => status !== optimisticStatus);

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
      {mediaType === "movie" && optimisticStatus === "completed" && (
        <WatchCountControl
          count={count}
          disabled={isPending}
          onIncrement={handleRewatch}
          onDecrement={handleUndoRewatch}
        />
      )}
      <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleRemove}>
        Remover
      </Button>

      <RateAfterWatchDialog open={ratingOpen} onOpenChange={setRatingOpen} label={titleName} onRate={onRate} />
    </div>
  );
}
