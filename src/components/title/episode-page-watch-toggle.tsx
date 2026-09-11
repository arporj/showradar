"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { WatchToggleButton } from "@/components/title/episode-watch-button";
import { WatchCountControl } from "@/components/title/watch-count-control";
import { RateAfterWatchDialog } from "@/components/title/rate-after-watch-dialog";
import { rewatchEpisode, toggleEpisodeWatched, undoEpisodeRewatch } from "@/lib/actions/episodes";
import { submitEpisodeRating } from "@/lib/actions/episode-ratings";
import { isOffline } from "@/lib/offline/network-status";
import { runOrQueue } from "@/lib/offline/run-or-queue";

export function EpisodePageWatchToggle({
  episodeId,
  titleId,
  tmdbTvId,
  seasonNumber,
  episodeNumber,
  episodeName,
  initialWatched,
  initialWatchCount,
  aired,
}: {
  episodeId: string;
  titleId: string;
  tmdbTvId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
  initialWatched: boolean;
  initialWatchCount: number;
  aired: boolean;
}) {
  const [watched, setWatched] = useState(initialWatched);
  const [count, setCount] = useState(initialWatchCount);
  const [ratingOpen, setRatingOpen] = useState(false);
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
      // Offline, the write is only queued (not actually confirmed by the
      // server yet), so submitEpisodeRating's "must have watched it" guard
      // would silently reject a rating submitted from the dialog — skip it
      // in that case, same as the "mark previous episodes too?" dialog does.
      if (next && !isOffline()) setRatingOpen(true);
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

      <RateAfterWatchDialog
        open={ratingOpen}
        onOpenChange={setRatingOpen}
        label={`${episodeNumber}. ${episodeName}`}
        onRate={(rating) => submitEpisodeRating({ episodeId, tmdbTvId, seasonNumber, episodeNumber, rating })}
      />
    </div>
  );
}
