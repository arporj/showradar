"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RateAfterWatchDialog } from "@/components/title/rate-after-watch-dialog";
import { addTitleToLibrary, addTitleToLibraryAsWatched } from "@/lib/actions/library";
import { submitRating } from "@/lib/actions/ratings";
import type { TmdbMediaType } from "@/lib/tmdb";

export function AddToLibraryButton({
  mediaType,
  tmdbId,
  title,
  initiallyAdded,
}: {
  mediaType: TmdbMediaType;
  tmdbId: number;
  title: string;
  initiallyAdded: boolean;
}) {
  const [state, setState] = useState<"none" | "added" | "watched">(initiallyAdded ? "added" : "none");
  const [pendingAction, setPendingAction] = useState<"add" | "watch" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ratingTitleId, setRatingTitleId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function markWatched() {
    setPendingAction("watch");
    startTransition(async () => {
      const { titleId } = await addTitleToLibraryAsWatched(mediaType, tmdbId);
      setState("watched");
      // Only the movie quick-action rates here — the TV path below marks
      // the whole series watched at once, not "a specific episode or movie".
      if (mediaType === "movie") setRatingTitleId(titleId);
    });
  }

  if (state === "added") {
    return (
      <Button type="button" size="sm" variant="secondary" disabled>
        Adicionado
      </Button>
    );
  }

  if (state === "watched") {
    return (
      <>
        <Button type="button" size="sm" variant="secondary" disabled>
          <Check /> Assistido
        </Button>
        <RateAfterWatchDialog
          open={ratingTitleId !== null}
          onOpenChange={(next) => !next && setRatingTitleId(null)}
          label={title}
          onRate={(rating) => submitRating(ratingTitleId!, mediaType, tmdbId, rating)}
        />
      </>
    );
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => {
          setPendingAction("add");
          startTransition(async () => {
            await addTitleToLibrary(mediaType, tmdbId);
            setState("added");
          });
        }}
      >
        {isPending && pendingAction === "add" ? "Adicionando..." : "Adicionar à grade"}
      </Button>

      {mediaType === "movie" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          aria-label="Adicionar à grade e marcar como assistido"
          onClick={markWatched}
        >
          {isPending && pendingAction === "watch" ? "Marcando..." : "Assistido"}
        </Button>
      ) : (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => setConfirmOpen(true)}
          >
            {isPending && pendingAction === "watch" ? "Marcando..." : "Assisti a série completa"}
          </Button>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Assistiu a série completa?</AlertDialogTitle>
                <AlertDialogDescription>
                  A série será adicionada à sua grade já com o status Assistido.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={markWatched}>Sim, assisti tudo</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}
