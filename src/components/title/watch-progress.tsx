"use client";

import { useRef, useState } from "react";

import { CelebrationOverlay } from "@/components/title/celebration-overlay";
import { SeasonList } from "@/components/title/season-list";
import { Progress } from "@/components/ui/progress";
import type { seasons as seasonsTable } from "@/db/schema";

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
  const totalWatched = Object.values(watchedCounts).reduce((sum, n) => sum + n, 0);
  // Tracks whether we've already celebrated this completion, so unmarking
  // and re-marking the last episode doesn't re-fire the overlay, and so a
  // show that was *already* complete on page load doesn't celebrate either.
  const wasCompleteRef = useRef(totalEpisodes > 0 && totalWatched >= totalEpisodes);
  // Same idea, per season, so finishing an individual season also celebrates
  // (unless the whole series just finished too — that overlay takes priority).
  const seasonWasCompleteRef = useRef(
    new Map(seasons.map((s) => [s.id, (s.episodeCount ?? 0) > 0 && (initialWatchedCounts[s.id] ?? 0) >= (s.episodeCount ?? 0)])),
  );

  function handleSeasonCountChange(seasonId: string, count: number) {
    setWatchedCounts((prev) => {
      const next = { ...prev, [seasonId]: count };
      const nextTotal = Object.values(next).reduce((sum, n) => sum + n, 0);
      const nowComplete = totalEpisodes > 0 && nextTotal >= totalEpisodes;

      const season = seasons.find((s) => s.id === seasonId);
      const seasonTotal = season?.episodeCount ?? 0;
      const seasonNowComplete = seasonTotal > 0 && count >= seasonTotal;
      const seasonWasComplete = seasonWasCompleteRef.current.get(seasonId) ?? false;

      if (nowComplete && !wasCompleteRef.current) {
        setCelebration({
          title: "Série concluída!",
          description: `Você assistiu a todos os episódios de ${showName}.`,
        });
      } else if (seasonNowComplete && !seasonWasComplete) {
        setCelebration({
          title: "Temporada concluída!",
          description: `Você assistiu a todos os episódios de ${season?.name ?? "temporada"}.`,
        });
      }

      wasCompleteRef.current = nowComplete;
      seasonWasCompleteRef.current.set(seasonId, seasonNowComplete);
      return next;
    });
  }

  const pct = totalEpisodes > 0 ? Math.round((totalWatched / totalEpisodes) * 100) : 0;

  return (
    <div className="space-y-4">
      {totalEpisodes > 0 && (
        <div className="max-w-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso geral</span>
            <span className="tabular-nums">
              {totalWatched}/{totalEpisodes} episódios
            </span>
          </div>
          <Progress value={pct} />
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
    </div>
  );
}
