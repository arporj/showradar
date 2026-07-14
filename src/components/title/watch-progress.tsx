"use client";

import { useRef, useState, useTransition } from "react";

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
import { CelebrationOverlay } from "@/components/title/celebration-overlay";
import { SeasonList } from "@/components/title/season-list";
import { Progress } from "@/components/ui/progress";
import type { seasons as seasonsTable } from "@/db/schema";
import { markAllEpisodesWatched } from "@/lib/actions/episodes";

export function WatchProgress({
  seasons,
  watchedCounts: initialWatchedCounts,
  totalEpisodes,
  titleId,
  tmdbId,
  showName,
}: {
  seasons: (typeof seasonsTable.$inferSelect)[];
  watchedCounts: Record<string, number>;
  totalEpisodes: number;
  titleId: string;
  tmdbId: number;
  showName: string;
}) {
  const [watchedCounts, setWatchedCounts] = useState(initialWatchedCounts);
  const [celebration, setCelebration] = useState<{ title: string; description: string } | null>(null);
  const [confirmMarkAll, setConfirmMarkAll] = useState(false);
  const [isMarkingAll, startMarkingAll] = useTransition();
  const totalWatched = Object.values(watchedCounts).reduce((sum, n) => sum + n, 0);
  // Tracks whether we've already celebrated this completion, so unmarking
  // and re-marking the last episode doesn't re-fire the overlay, and so a
  // show that was *already* complete on page load doesn't celebrate either.
  const wasCompleteRef = useRef(totalEpisodes > 0 && totalWatched >= totalEpisodes);

  // Only the series-level completion celebrates — finishing an individual
  // season (even the latest one) doesn't, since there's nothing to interrupt
  // for until the whole show is actually done.
  function handleSeasonCountChange(seasonId: string, count: number) {
    setWatchedCounts((prev) => {
      const next = { ...prev, [seasonId]: count };
      const nextTotal = Object.values(next).reduce((sum, n) => sum + n, 0);
      const nowComplete = totalEpisodes > 0 && nextTotal >= totalEpisodes;

      if (nowComplete && !wasCompleteRef.current) {
        setCelebration({
          title: "Série concluída!",
          description: `Você assistiu a todos os episódios de ${showName}.`,
        });
      }

      wasCompleteRef.current = nowComplete;
      return next;
    });
  }

  // Merges every season's new count in one state update instead of looping
  // handleSeasonCountChange per season, which would trigger a render (and a
  // wasCompleteRef check) per season instead of one combined update.
  function handleMarkAllWatched() {
    setConfirmMarkAll(false);
    startMarkingAll(async () => {
      const { watchedCountsBySeasonId } = await markAllEpisodesWatched(titleId, tmdbId);
      setWatchedCounts((prev) => {
        const next = { ...prev, ...watchedCountsBySeasonId };
        const nextTotal = Object.values(next).reduce((sum, n) => sum + n, 0);
        const nowComplete = totalEpisodes > 0 && nextTotal >= totalEpisodes;

        if (nowComplete && !wasCompleteRef.current) {
          setCelebration({
            title: "Série concluída!",
            description: `Você assistiu a todos os episódios de ${showName}.`,
          });
        }
        wasCompleteRef.current = nowComplete;

        return next;
      });
    });
  }

  const pct = totalEpisodes > 0 ? Math.round((totalWatched / totalEpisodes) * 100) : 0;

  return (
    <div className="space-y-4">
      {totalEpisodes > 0 && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-sm flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso geral</span>
              <span className="tabular-nums">
                {totalWatched}/{totalEpisodes} episódios
              </span>
            </div>
            <Progress value={pct} />
          </div>

          {totalWatched < totalEpisodes && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isMarkingAll}
              onClick={() => setConfirmMarkAll(true)}
            >
              {isMarkingAll ? "Marcando..." : "Marcar série inteira como assistida"}
            </Button>
          )}
        </div>
      )}

      <SeasonList
        seasons={seasons}
        watchedCounts={watchedCounts}
        titleId={titleId}
        tmdbId={tmdbId}
        onSeasonCountChange={handleSeasonCountChange}
      />

      <CelebrationOverlay
        show={celebration !== null}
        title={celebration?.title ?? ""}
        description={celebration?.description ?? ""}
        onClose={() => setCelebration(null)}
      />

      <AlertDialog open={confirmMarkAll} onOpenChange={setConfirmMarkAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar série inteira como assistida?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os episódios já exibidos de {showName}, em todas as temporadas, serão marcados como assistidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAllWatched}>Marcar tudo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
