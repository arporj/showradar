"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import type { EpisodeGroupEntry } from "@/lib/feed";
import { cn } from "@/lib/utils";

export function EpisodeGroupToggle({ episodes }: { episodes: EpisodeGroupEntry[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        aria-expanded={open}
      >
        <ChevronDown className={cn("size-3 shrink-0 transition-transform", open && "rotate-180")} />
        {open ? "Ocultar episódios anteriores" : `+ ${episodes.length} ${episodes.length === 1 ? "episódio anterior" : "episódios anteriores"}`}
      </button>

      {open && (
        <ul className="mt-1 space-y-0.5 border-l pl-2">
          {episodes.map((episode) => (
            <li key={episode.key} className="truncate text-xs text-muted-foreground">
              T{episode.seasonNumber}E{episode.episodeNumber}
              {episode.episodeName ? ` • ${episode.episodeName}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
