"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";

import { CelebrationOverlay } from "@/components/title/celebration-overlay";
import { WatchToggleButton } from "@/components/title/episode-watch-button";
import { toggleEpisodeWatched } from "@/lib/actions/episodes";
import type { NextEpisodeItem } from "@/lib/next-episode";
import { runOrQueue } from "@/lib/offline/run-or-queue";
import { tmdbImageUrl } from "@/lib/tmdb";

export function NextEpisodeCard({ item }: { item: NextEpisodeItem }) {
  const [justMarked, setJustMarked] = useState(false);
  const [celebration, setCelebration] = useState<{ title: string; description: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const image = tmdbImageUrl(item.stillPath ?? item.posterPath, item.stillPath ? "w300" : "w185");

  function handleMarkWatched() {
    setJustMarked(true);
    startTransition(async () => {
      // Revalidates /dashboard server-side, so once this resolves the whole
      // list re-renders with this show's *next* episode (or drops it if
      // there isn't one available yet) — no manual refetch needed here.
      // Offline, the toggle is queued instead: `result` is undefined and the
      // celebration is simply skipped (not critical for correctness).
      const result = await runOrQueue(
        () => toggleEpisodeWatched(item.episodeId, true, item.titleId, item.tmdbId),
        { type: "episode-toggle", payload: { episodeId: item.episodeId, watched: true, titleId: item.titleId, tmdbTvId: item.tmdbId } },
      );
      if (result?.seriesCompleted) {
        setCelebration({
          title: "Série concluída!",
          description: `Você assistiu a todos os episódios de ${item.showName}.`,
        });
      }
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Link
        href={`/title/tv/${item.tmdbId}`}
        className="relative h-16 w-28 shrink-0 overflow-hidden rounded bg-muted"
      >
        {image && <Image src={image} alt="" fill sizes="112px" className="object-cover" />}
      </Link>
      <Link href={`/title/tv/${item.tmdbId}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.showName}</p>
        <p className="truncate text-xs text-muted-foreground">
          T{item.seasonNumber}E{item.episodeNumber}
          {item.episodeName ? ` • ${item.episodeName}` : ""}
        </p>
      </Link>
      <WatchToggleButton
        watched={justMarked}
        disabled={isPending || justMarked}
        loading={isPending}
        onToggle={handleMarkWatched}
        label={`Marcar T${item.seasonNumber}E${item.episodeNumber} como assistido`}
        size="lg"
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
