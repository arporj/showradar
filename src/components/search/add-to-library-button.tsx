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
import { addTitleToLibrary, addTitleToLibraryAsWatched } from "@/lib/actions/library";
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
  const [state, setState] = useState<"none" | "added" | "watched">(initiallyAdded ? "added" : "none");
  const [pendingAction, setPendingAction] = useState<"add" | "watch" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function markWatched() {
    setPendingAction("watch");
    startTransition(async () => {
      await addTitleToLibraryAsWatched(mediaType, tmdbId);
      setState("watched");
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
      <Button type="button" size="sm" variant="secondary" disabled>
        <Check /> Assistido
      </Button>
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
