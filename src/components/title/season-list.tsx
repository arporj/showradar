"use client";

import { CheckCheck, ChevronDown } from "lucide-react";
import Image from "next/image";
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
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EpisodeDetailDialog } from "@/components/title/episode-detail-dialog";
import { WatchToggleButton } from "@/components/title/episode-watch-button";
import type { seasons as seasonsTable } from "@/db/schema";
import {
  loadSeasonEpisodes,
  markEpisodesWatchedThrough,
  setSeasonWatched,
  toggleEpisodeWatched,
} from "@/lib/actions/episodes";
import { formatDate } from "@/lib/format-date";
import { isOffline } from "@/lib/offline/network-status";
import { runOrQueue } from "@/lib/offline/run-or-queue";
import { todayBrDateString } from "@/lib/release-dates";
import { tmdbImageUrl } from "@/lib/tmdb";
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
}: {
  seasons: SeasonRow[];
  watchedCounts: Record<string, number>;
  titleId: string;
  tmdbId: number;
  onSeasonCountChange: (seasonId: string, count: number) => void;
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
}: {
  season: SeasonRow;
  seasons: SeasonRow[];
  watchedCount: number;
  watchedCounts: Record<string, number>;
  titleId: string;
  tmdbId: number;
  onSeasonCountChange: (seasonId: string, count: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [episodeRows, setEpisodeRows] = useState<EpisodeRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [markingSeason, setMarkingSeason] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [, startTransition] = useTransition();

  const total = season.episodeCount ?? 0;
  const pct = total > 0 ? Math.round((watchedCount / total) * 100) : 0;
  const seasonComplete = total > 0 && watchedCount >= total;

  const incompleteEarlierSeasons = seasons.filter(
    (s) => s.seasonNumber < season.seasonNumber && (watchedCounts[s.id] ?? 0) < (s.episodeCount ?? 0),
  );

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && episodeRows === null) {
      setLoading(true);
      const rows = await loadSeasonEpisodes({
        seasonId: season.id,
        titleId,
        tmdbTvId: tmdbId,
        seasonNumber: season.seasonNumber,
      });
      setEpisodeRows(rows);
      setLoading(false);
    }
  }

  // Bulk-marks every earlier season fully watched, in the background —
  // used after the user confirms "yes, mark previous ones too".
  function markEarlierSeasonsInBackground() {
    for (const s of incompleteEarlierSeasons) {
      startTransition(async () => {
        const { airedCount } = await setSeasonWatched({
          seasonId: s.id,
          titleId,
          tmdbTvId: tmdbId,
          seasonNumber: s.seasonNumber,
          watched: true,
        });
        onSeasonCountChange(s.id, airedCount);
      });
    }
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
    // markEarlierSeasonsInBackground/markEpisodesWatchedThrough below) — a
    // click always just marks the one episode clicked, as if the user had
    // answered "No, just this one".
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

    markEarlierSeasonsInBackground();
    startTransition(async () => {
      const { watchedEpisodeIds } = await markEpisodesWatchedThrough({
        seasonId: season.id,
        titleId,
        tmdbTvId: tmdbId,
        seasonNumber: season.seasonNumber,
        throughEpisodeNumber: episode.episodeNumber,
      });
      const watchedSet = new Set(watchedEpisodeIds);
      // Computed from the current episodeRows closure (not from inside the
      // setEpisodeRows updater below) — calling another component's setState
      // from within a setState updater triggers a React warning.
      const newCount = episodeRows
        ? episodeRows.filter((e) => e.watched || watchedSet.has(e.id)).length
        : watchedEpisodeIds.length;
      onSeasonCountChange(season.id, newCount);
      setEpisodeRows((prev) => prev!.map((e) => (watchedSet.has(e.id) ? { ...e, watched: true } : e)));
    });
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
    // markEarlierSeasonsInBackground below) — always just toggles this season.
    if (!isOffline() && nextWatched && incompleteEarlierSeasons.length > 0) {
      setConfirm({ type: "season" });
      return;
    }
    applySeasonToggle(nextWatched);
  }

  function handleConfirmSeason(markPrevious: boolean) {
    setConfirm(null);
    if (markPrevious) markEarlierSeasonsInBackground();
    applySeasonToggle(true);
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

        {!loading && episodeRows && (
          <div className="space-y-1 pt-3">
            {episodeRows.map((episode) => (
              <EpisodeRowItem key={episode.id} episode={episode} onToggle={() => handleToggleEpisode(episode)} />
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

function EpisodeRowItem({ episode, onToggle }: { episode: EpisodeRow; onToggle: () => void }) {
  const aired = isAired(episode.airDate);
  const still = tmdbImageUrl(episode.stillPath, "w300");
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/50">
      <button
        type="button"
        onClick={() => setDetailOpen(true)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div className="relative h-11 w-20 shrink-0 overflow-hidden rounded bg-muted">
          {still && <Image src={still} alt="" fill sizes="80px" className="object-cover" />}
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
      </button>
      <WatchToggleButton
        watched={episode.watched}
        disabled={!aired}
        onToggle={onToggle}
        label={episode.watched ? `Desmarcar episódio ${episode.episodeNumber}` : `Marcar episódio ${episode.episodeNumber} como assistido`}
      />
      <EpisodeDetailDialog episode={episode} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
