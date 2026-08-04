"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";

import { CelebrationOverlay } from "@/components/title/celebration-overlay";
import { WatchToggleButton } from "@/components/title/episode-watch-button";
import { getStreamingProviders } from "@/components/title/watch-providers";
import { markDashboardEpisodeWatched } from "@/lib/actions/episodes";
import type { NextEpisodeItem } from "@/lib/next-episode";
import { runOrQueue } from "@/lib/offline/run-or-queue";
import { tmdbImageUrl, type TmdbWatchProviderRegion } from "@/lib/tmdb";
import { tmdbImageLoader } from "@/lib/tmdb-image-loader";

export function NextEpisodeCard({ item: initialItem }: { item: NextEpisodeItem }) {
  const [item, setItem] = useState(initialItem);
  const [hidden, setHidden] = useState(false);
  const [justMarked, setJustMarked] = useState(false);
  const [celebration, setCelebration] = useState<{ title: string; description: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const image = tmdbImageUrl(item.stillPath ?? item.posterPath, item.stillPath ? "w300" : "w185");
  const episodeHref = `/title/tv/${item.tmdbId}/season/${item.seasonNumber}/episode/${item.episodeNumber}`;
  // Só o provider de maior prioridade — um selo discreto no canto da capa,
  // não uma fileira de logos, pra não poluir a linha compacta do dashboard.
  const [provider] = getStreamingProviders(item.watchProvidersBr as TmdbWatchProviderRegion | null);
  const providerLogo = provider ? tmdbImageUrl(provider.logo_path, "w45") : null;

  function handleMarkWatched() {
    setJustMarked(true);
    startTransition(async () => {
      // Doesn't touch /dashboard's server-side cache at all — the action
      // returns this show's own next episode directly, so the card updates
      // itself instead of waiting on (and forcing) a full dashboard
      // recompute. Offline, the toggle is queued instead: `result` is
      // undefined and the card just stays as-is until it syncs.
      const result = await runOrQueue(
        () => markDashboardEpisodeWatched(item.episodeId, item.titleId, item.tmdbId),
        { type: "episode-toggle", payload: { episodeId: item.episodeId, watched: true, titleId: item.titleId, tmdbTvId: item.tmdbId } },
      );
      if (!result) return;
      if (result.seriesCompleted) {
        setCelebration({
          title: "Série concluída!",
          description: `Você assistiu a todos os episódios de ${item.showName}.`,
        });
        setHidden(true);
        return;
      }
      if (result.nextEpisode) {
        setItem(result.nextEpisode);
        setJustMarked(false);
      } else {
        // Caught up on everything aired so far — belongs in "Em breve"
        // instead, once the next episode actually airs.
        setHidden(true);
      }
    });
  }

  if (hidden && !celebration) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Link href={episodeHref} className="relative h-16 w-28 shrink-0 overflow-hidden rounded bg-muted">
        {image && <Image loader={tmdbImageLoader} src={image} alt="" fill sizes="112px" className="object-cover" />}
        {providerLogo && (
          <span
            title={provider.provider_name}
            className="absolute bottom-1 right-1 size-5 overflow-hidden rounded ring-1 ring-background"
          >
            <Image
              loader={tmdbImageLoader}
              src={providerLogo}
              alt={provider.provider_name}
              fill
              sizes="20px"
              className="object-cover"
            />
          </span>
        )}
      </Link>
      <Link href={episodeHref} className="min-w-0 flex-1">
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
