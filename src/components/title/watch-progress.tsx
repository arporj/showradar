"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

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
  // Temporada até onde um backfill ("marcar anteriores") está rodando agora.
  // Mora aqui, e não no SeasonItem, porque o bulk mexe em várias temporadas
  // ao mesmo tempo e cada uma delas precisa mostrar que está em andamento.
  const [pendingBulkThrough, setPendingBulkThrough] = useState<number | null>(null);

  // Season 0 (specials) is excluded here too, so this sum lines up with
  // `totalEpisodes` (already specials-free, see the title page) instead of
  // drifting past 100% or completing early just because specials got marked.
  const regularSeasonIds = new Set(seasons.filter((s) => s.seasonNumber !== 0).map((s) => s.id));
  const sumWatched = (counts: Record<string, number>) =>
    Object.entries(counts).reduce((sum, [seasonId, n]) => sum + (regularSeasonIds.has(seasonId) ? n : 0), 0);

  const totalWatched = sumWatched(watchedCounts);
  // Tracks whether we've already celebrated this completion, so unmarking
  // and re-marking the last episode doesn't re-fire the overlay, and so a
  // show that was *already* complete on page load doesn't celebrate either.
  const wasCompleteRef = useRef(totalEpisodes > 0 && totalWatched >= totalEpisodes);

  // Único ponto que aplica contagens novas — seja de uma temporada só ou de
  // várias de uma vez (bulk). Aplicar tudo em um `setState` é o que garante
  // uma comemoração só: um bulk que fecha a série cruza o total uma vez,
  // não uma vez por temporada.
  //
  // Only the series-level completion celebrates — finishing an individual
  // season (even the latest one) doesn't, since there's nothing to interrupt
  // for until the whole show is actually done.
  function applySeasonCounts(counts: Record<string, number>) {
    setWatchedCounts((prev) => {
      const next = { ...prev, ...counts };
      const nextTotal = sumWatched(next);
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

  function handleSeasonCountChange(seasonId: string, count: number) {
    applySeasonCounts({ [seasonId]: count });
  }

  function handleMarkAllWatched() {
    setConfirmMarkAll(false);
    startMarkingAll(async () => {
      try {
        const { watchedCountsBySeasonId } = await markAllEpisodesWatched(titleId, tmdbId);
        applySeasonCounts(watchedCountsBySeasonId);
      } catch {
        // Sem isso a ação falha em silêncio: a transição termina, o botão
        // volta ao normal e nada muda na tela — exatamente o "não acontece
        // nada" que não dá para distinguir de um bug de marcação.
        toast.error("Não foi possível marcar a série inteira. Tente novamente.");
      }
    });
  }

  const pct = totalEpisodes > 0 ? Math.round((totalWatched / totalEpisodes) * 100) : 0;

  // Mesmo recorte que markWatchedThroughSeason aplica no servidor (a
  // temporada 0 só entra quando é ela própria o alvo), para o spinner
  // aparecer exatamente nas temporadas que vão mudar.
  const pendingSeasonIds = new Set(
    isMarkingAll
      ? seasons.map((s) => s.id)
      : pendingBulkThrough == null
        ? []
        : seasons
            .filter(
              (s) =>
                s.seasonNumber === pendingBulkThrough ||
                (s.seasonNumber !== 0 && s.seasonNumber < pendingBulkThrough),
            )
            .map((s) => s.id),
  );

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
        onSeasonCountsChange={applySeasonCounts}
        pendingSeasonIds={pendingSeasonIds}
        onBulkPendingChange={setPendingBulkThrough}
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
