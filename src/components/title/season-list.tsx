"use client";

import { CheckCheck, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { WatchToggleButton } from "@/components/title/episode-watch-button";
import type { seasons as seasonsTable } from "@/db/schema";
import {
  loadSeasonEpisodes,
  markWatchedThroughSeason,
  setSeasonWatched,
  toggleEpisodeWatched,
} from "@/lib/actions/episodes";
import { formatDate } from "@/lib/format-date";
import { isOffline } from "@/lib/offline/network-status";
import { runOrQueue } from "@/lib/offline/run-or-queue";
import { todayBrDateString } from "@/lib/release-dates";
import { tmdbImageUrl } from "@/lib/tmdb";
import { tmdbImageLoader } from "@/lib/tmdb-image-loader";
import { cn } from "@/lib/utils";

type SeasonRow = typeof seasonsTable.$inferSelect;
type EpisodeRow = Awaited<ReturnType<typeof loadSeasonEpisodes>>[number];
type ConfirmState = { type: "episode"; episode: EpisodeRow } | { type: "season" };

const todayDateString = todayBrDateString();

// Many specials/extras (season 0) come back from TMDb with no air_date at
// all — treated as already aired (mirrors lib/actions/episodes.ts::airedCondition)
// so their watch toggle isn't stuck disabled; only a *known* future date
// holds an episode back.
function isAired(airDate: string | null) {
  return !airDate || airDate <= todayDateString;
}

export function SeasonList({
  seasons,
  watchedCounts,
  titleId,
  tmdbId,
  onSeasonCountChange,
  onSeasonCountsChange,
}: {
  seasons: SeasonRow[];
  watchedCounts: Record<string, number>;
  titleId: string;
  tmdbId: number;
  onSeasonCountChange: (seasonId: string, count: number) => void;
  onSeasonCountsChange: (counts: Record<string, number>) => void;
}) {
  return (
    <div className="space-y-2">
      {seasons.map((season) => (
        <SeasonItem
          key={season.id}
          season={season}
          seasons={seasons}
          watchedCount={watchedCounts[season.id] ?? 0}
          watchedCounts={watchedCounts}
          titleId={titleId}
          tmdbId={tmdbId}
          onSeasonCountChange={onSeasonCountChange}
          onSeasonCountsChange={onSeasonCountsChange}
        />
      ))}
    </div>
  );
}

function SeasonItem({
  season,
  seasons,
  watchedCount,
  watchedCounts,
  titleId,
  tmdbId,
  onSeasonCountChange,
  onSeasonCountsChange,
}: {
  season: SeasonRow;
  seasons: SeasonRow[];
  watchedCount: number;
  watchedCounts: Record<string, number>;
  titleId: string;
  tmdbId: number;
  onSeasonCountChange: (seasonId: string, count: number) => void;
  onSeasonCountsChange: (counts: Record<string, number>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [episodeRows, setEpisodeRows] = useState<EpisodeRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [markingSeason, setMarkingSeason] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [, startTransition] = useTransition();

  const total = season.episodeCount ?? 0;
  const pct = total > 0 ? Math.round((watchedCount / total) * 100) : 0;
  const seasonComplete = total > 0 && watchedCount >= total;

  // Temporada 0 (especiais) fora: não é "anterior" na ordem de exibição, então
  // especiais não assistidos não devem disparar o diálogo de backfill nem ser
  // varridos por ele — mesmo recorte que markWatchedThroughSeason aplica no
  // servidor.
  const incompleteEarlierSeasons = seasons.filter(
    (s) =>
      s.seasonNumber !== 0 &&
      s.seasonNumber < season.seasonNumber &&
      (watchedCounts[s.id] ?? 0) < (s.episodeCount ?? 0),
  );

  async function fetchEpisodes() {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await loadSeasonEpisodes({
        seasonId: season.id,
        titleId,
        tmdbTvId: tmdbId,
        seasonNumber: season.seasonNumber,
      });
      setEpisodeRows(rows);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && episodeRows === null) {
      await fetchEpisodes();
    }
  }

  // "Sim, marcar todos": marca tudo até este ponto — as temporadas anteriores
  // inteiras e, nesta temporada, até `throughEpisodeNumber` (ou a temporada
  // toda, quando omitido). Uma server action só, em vez de uma por temporada
  // anterior: o servidor faz um INSERT único e devolve todas as contagens
  // juntas, então a tela atualiza de uma vez e a comemoração de série
  // concluída dispara uma única vez, no fim.
  function markThroughHere(throughEpisodeNumber?: number) {
    setMarkingSeason(true);
    startTransition(async () => {
      try {
        const { watchedCountsBySeasonId, watchedEpisodeIds } = await markWatchedThroughSeason({
          titleId,
          tmdbTvId: tmdbId,
          throughSeasonNumber: season.seasonNumber,
          throughEpisodeNumber,
        });
        const watchedSet = new Set(watchedEpisodeIds);
        // O servidor conta só o que entra no recorte; episódios desta
        // temporada já assistidos *depois* do ponto marcado continuam valendo.
        const alreadyWatchedBeyond = episodeRows
          ? episodeRows.filter((e) => e.watched && !watchedSet.has(e.id)).length
          : 0;
        onSeasonCountsChange({
          ...watchedCountsBySeasonId,
          [season.id]: (watchedCountsBySeasonId[season.id] ?? 0) + alreadyWatchedBeyond,
        });
        setEpisodeRows((prev) => (prev ? prev.map((e) => (watchedSet.has(e.id) ? { ...e, watched: true } : e)) : prev));
      } catch {
        toast.error("Não foi possível marcar os episódios anteriores. Tente novamente.");
      } finally {
        setMarkingSeason(false);
      }
    });
  }

  function applyEpisodeToggle(episode: EpisodeRow, nextWatched: boolean) {
    setEpisodeRows((prev) => prev!.map((e) => (e.id === episode.id ? { ...e, watched: nextWatched } : e)));
    onSeasonCountChange(season.id, watchedCount + (nextWatched ? 1 : -1));
    startTransition(async () => {
      await runOrQueue(() => toggleEpisodeWatched(episode.id, nextWatched, titleId, tmdbId), {
        type: "episode-toggle",
        payload: { episodeId: episode.id, watched: nextWatched, titleId, tmdbTvId: tmdbId },
      });
    });
  }

  function handleToggleEpisode(episode: EpisodeRow) {
    if (episode.watched) {
      applyEpisodeToggle(episode, false);
      return;
    }

    const earlierInSeasonUnwatched = episodeRows!.some(
      (e) => e.episodeNumber < episode.episodeNumber && isAired(e.airDate) && !e.watched,
    );

    // Offline, the "mark previous too?" backfill flow is out of scope (see
    // markThroughHere above — não passa pela fila offline) — a click always
    // just marks the one episode clicked, as if the user had answered "No,
    // just this one".
    if (!isOffline() && (earlierInSeasonUnwatched || incompleteEarlierSeasons.length > 0)) {
      setConfirm({ type: "episode", episode });
      return;
    }

    applyEpisodeToggle(episode, true);
  }

  function handleConfirmEpisode(episode: EpisodeRow, markPrevious: boolean) {
    setConfirm(null);
    if (!markPrevious) {
      applyEpisodeToggle(episode, true);
      return;
    }
    markThroughHere(episode.episodeNumber);
  }

  function applySeasonToggle(nextWatched: boolean) {
    setMarkingSeason(true);
    // Offline fallback for the aired-episode count normally returned by the
    // server action — computed from already-loaded props, no network
    // needed. An approximation for a still-airing season (episodeCount may
    // include unaired episodes), but it self-corrects once the queued
    // mutation actually replays and the page's data refreshes.
    const offlineAiredEstimate = episodeRows
      ? episodeRows.filter((e) => isAired(e.airDate)).length
      : (season.episodeCount ?? 0);
    startTransition(async () => {
      const result = await runOrQueue(
        () =>
          setSeasonWatched({
            seasonId: season.id,
            titleId,
            tmdbTvId: tmdbId,
            seasonNumber: season.seasonNumber,
            watched: nextWatched,
          }),
        {
          type: "season-toggle",
          payload: { seasonId: season.id, titleId, tmdbTvId: tmdbId, seasonNumber: season.seasonNumber, watched: nextWatched },
        },
      );
      const airedCount = result ? result.airedCount : offlineAiredEstimate;
      const nextCount = nextWatched ? airedCount : 0;
      onSeasonCountChange(season.id, nextCount);
      setEpisodeRows((prev) => (prev ? prev.map((e) => (isAired(e.airDate) ? { ...e, watched: nextWatched } : e)) : prev));
      setMarkingSeason(false);
    });
  }

  function handleMarkSeason() {
    const nextWatched = !seasonComplete;
    // Offline, the "mark previous seasons too?" flow is out of scope (see
    // markThroughHere above) — always just toggles this season.
    if (!isOffline() && nextWatched && incompleteEarlierSeasons.length > 0) {
      setConfirm({ type: "season" });
      return;
    }
    applySeasonToggle(nextWatched);
  }

  function handleConfirmSeason(markPrevious: boolean) {
    setConfirm(null);
    if (markPrevious) markThroughHere();
    else applySeasonToggle(true);
  }

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange} className="rounded-lg border">
      <div className="flex items-center gap-2 p-3">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-3 text-left text-sm">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{season.name}</p>
              <Badge variant="secondary" className="shrink-0">
                {total} {total === 1 ? "episódio" : "episódios"}
              </Badge>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={pct} className="flex-1" />
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {watchedCount}/{total}
              </span>
            </div>
          </div>
          <ChevronDown
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          />
        </CollapsibleTrigger>

        <WatchToggleButton
          watched={seasonComplete}
          disabled={markingSeason || total === 0}
          onToggle={handleMarkSeason}
          icon={CheckCheck}
          size="lg"
          label={seasonComplete ? "Desmarcar temporada inteira" : "Marcar temporada inteira"}
        />
      </div>

      <CollapsibleContent className="border-t px-3 pb-3">
        {loading && (
          <div className="space-y-2 pt-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}

        {!loading && loadError && (
          <div className="space-y-2 pt-3 text-sm">
            <p className="text-destructive">Não foi possível carregar os episódios desta temporada.</p>
            <p className="break-all rounded bg-muted p-2 font-mono text-xs text-muted-foreground">{loadError}</p>
            <Button variant="outline" size="sm" onClick={fetchEpisodes}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!loading && !loadError && episodeRows && (
          <div className="space-y-1 pt-3">
            {episodeRows.map((episode) => (
              <EpisodeRowItem
                key={episode.id}
                episode={episode}
                href={`/title/tv/${tmdbId}/season/${season.seasonNumber}/episode/${episode.episodeNumber}`}
                onToggle={() => handleToggleEpisode(episode)}
              />
            ))}
          </div>
        )}
      </CollapsibleContent>

      <AlertDialog open={confirm !== null} onOpenChange={(next) => !next && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar episódios anteriores?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.type === "episode"
                ? "Ainda faltam episódios anteriores a este para marcar como assistidos."
                : "Ainda faltam temporadas anteriores a esta para marcar como assistidas."}{" "}
              Quer marcar todos eles também?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                if (confirm?.type === "episode") handleConfirmEpisode(confirm.episode, false);
                else if (confirm?.type === "season") handleConfirmSeason(false);
              }}
            >
              Não, só este
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm?.type === "episode") handleConfirmEpisode(confirm.episode, true);
                else if (confirm?.type === "season") handleConfirmSeason(true);
              }}
            >
              Sim, marcar todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  );
}

function EpisodeRowItem({ episode, href, onToggle }: { episode: EpisodeRow; href: string; onToggle: () => void }) {
  const aired = isAired(episode.airDate);
  const still = tmdbImageUrl(episode.stillPath, "w300");

  return (
    <div className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/50">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="relative h-11 w-20 shrink-0 overflow-hidden rounded bg-muted">
          {still && <Image loader={tmdbImageLoader} src={still} alt="" fill sizes="80px" className="object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            <span className="text-muted-foreground">{episode.episodeNumber}. </span>
            {episode.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {episode.airDate
              ? aired
                ? formatDate(episode.airDate)
                : `Estreia em ${formatDate(episode.airDate)}`
              : "Data a definir"}
          </p>
        </div>
      </Link>
      <WatchToggleButton
        watched={episode.watched}
        disabled={!aired}
        onToggle={onToggle}
        label={episode.watched ? `Desmarcar episódio ${episode.episodeNumber}` : `Marcar episódio ${episode.episodeNumber} como assistido`}
      />
    </div>
  );
}
