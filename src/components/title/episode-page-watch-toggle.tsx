"use client";

import { useState, useTransition } from "react";

import { WatchToggleButton } from "@/components/title/episode-watch-button";
import { toggleEpisodeWatched } from "@/lib/actions/episodes";
import { runOrQueue } from "@/lib/offline/run-or-queue";

export function EpisodePageWatchToggle({
  episodeId,
  titleId,
  tmdbTvId,
  seasonNumber,
  episodeNumber,
  initialWatched,
  aired,
}: {
  episodeId: string;
  titleId: string;
  tmdbTvId: number;
  seasonNumber: number;
  episodeNumber: number;
  initialWatched: boolean;
  aired: boolean;
}) {
  const [watched, setWatched] = useState(initialWatched);
  const [, startTransition] = useTransition();

  function handleToggle() {
    const next = !watched;
    setWatched(next);
    startTransition(async () => {
      await runOrQueue(
        () => toggleEpisodeWatched(episodeId, next, titleId, tmdbTvId, seasonNumber, episodeNumber),
        { type: "episode-toggle", payload: { episodeId, watched: next, titleId, tmdbTvId } },
      );
    });
  }

  return (
    <WatchToggleButton
      watched={watched}
      disabled={!aired}
      onToggle={handleToggle}
      label={watched ? "Desmarcar como assistido" : "Marcar como assistido"}
      size="lg"
    />
  );
}
