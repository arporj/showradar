"use client";

import Image from "next/image";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format-date";
import { todayBrDateString } from "@/lib/release-dates";
import { tmdbImageUrl } from "@/lib/tmdb";

type EpisodeDetail = {
  episodeNumber: number;
  name: string | null;
  overview: string | null;
  airDate: string | null;
  runtime: number | null;
  stillPath: string | null;
  voteAverage: string | null;
};

export function EpisodeDetailDialog({
  episode,
  open,
  onOpenChange,
}: {
  episode: EpisodeDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const aired = !episode.airDate || episode.airDate <= todayBrDateString();
  const still = tmdbImageUrl(episode.stillPath, "w500");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="relative -m-4 mb-0 aspect-video overflow-hidden rounded-t-xl bg-muted">
          {still && <Image src={still} alt="" fill sizes="450px" className="object-cover" />}
        </div>

        <DialogHeader>
          <DialogTitle>
            {episode.episodeNumber}. {episode.name}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {episode.airDate
              ? aired
                ? formatDate(episode.airDate)
                : `Estreia em ${formatDate(episode.airDate)}`
              : "Data a definir"}
            {episode.runtime ? ` • ${episode.runtime} min` : ""}
            {episode.voteAverage != null ? ` • ${Number(episode.voteAverage).toFixed(1)}/10` : ""}
          </p>
        </DialogHeader>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {episode.overview || "Sem sinopse disponível."}
        </p>
      </DialogContent>
    </Dialog>
  );
}
