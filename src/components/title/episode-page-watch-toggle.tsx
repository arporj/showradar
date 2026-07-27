"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { WatchToggleButton } from "@/components/title/episode-watch-button";
import { WatchCountControl } from "@/components/title/watch-count-control";
import { rewatchEpisode, toggleEpisodeWatched, undoEpisodeRewatch } from "@/lib/actions/episodes";
import { runOrQueue } from "@/lib/offline/run-or-queue";

export function EpisodePageWatchToggle({
  episodeId,
  titleId,
  tmdbTvId,
  seasonNumber,
  episodeNumber,
  initialWatched,
  initialWatchCount,
  aired,
}: {
  episodeId: string;
  titleId: string;
  tmdbTvId: number;
  seasonNumber: number;
  episodeNumber: number;
  initialWatched: boolean;
  initialWatchCount: number;
  aired: boolean;
}) {
  const [watched, setWatched] = useState(initialWatched);
  const [count, setCount] = useState(initialWatchCount);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !watched;
    setWatched(next);
    // Marking watched from scratch logs a new watch event (see
    // markEpisodesWatched in lib/actions/episodes.ts); unmarking doesn't
    // delete any watch history, so the count itself doesn't need to move.
    if (next) setCount((c) => c + 1);
    startTransition(async () => {
      await runOrQueue(
        () => toggleEpisodeWatched(episodeId, next, titleId, tmdbTvId, seasonNumber, episodeNumber),
        { type: "episode-toggle", payload: { episodeId, watched: next, titleId, tmdbTvId } },
      );
    });
  }

  function handleRewatch() {
    setCount((c) => c + 1);
    startTransition(async () => {
      await rewatchEpisode(episodeId, titleId, tmdbTvId, seasonNumber, episodeNumber);
      toast.success("Nova vista registrada");
    });
  }

  function handleUndoRewatch() {
    setCount((c) => Math.max(1, c - 1));
    startTransition(async () => {
      await undoEpisodeRewatch(episodeId, titleId, tmdbTvId, seasonNumber, episodeNumber);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <WatchToggleButton
        watched={watched}
        disabled={!aired}
        onToggle={handleToggle}
        label={watched ? "Desmarcar como assistido" : "Marcar como assistido"}
        size="lg"
      />
      {watched && (
        <WatchCountControl
          count={count}
          disabled={isPending}
          onIncrement={handleRewatch}
          onDecrement={handleUndoRewatch}
        />
      )}
    </div>
  );
}
