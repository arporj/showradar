"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { WatchToggleButton } from "@/components/title/episode-watch-button";
import { Button } from "@/components/ui/button";
import { rewatchEpisode, toggleEpisodeWatched } from "@/lib/actions/episodes";
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
  const [isPending, startTransition] = useTransition();

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

  function handleRewatch() {
    startTransition(async () => {
      await rewatchEpisode(episodeId, titleId, tmdbTvId, seasonNumber, episodeNumber);
      toast.success("Nova vista registrada");
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
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleRewatch}>
          Assistir de novo
        </Button>
      )}
    </div>
  );
}
