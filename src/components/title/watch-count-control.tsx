"use client";

import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

// Shared by the movie library control and the episode page toggle — shows
// how many times the user has watched a title/episode, with "-" reserved
// for undoing an accidental "Assistir de novo" click (never available at 1,
// since that's the only watched/unwatched signal there is, and belongs to
// the checkbox/status control instead).
export function WatchCountControl({
  count,
  disabled,
  onIncrement,
  onDecrement,
}: {
  count: number;
  disabled?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border px-1 py-0.5">
      <button
        type="button"
        aria-label="Remover última vista"
        title="Remover última vista"
        disabled={disabled || count <= 1}
        onClick={onDecrement}
        className={cn(
          "flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors",
          "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30",
        )}
      >
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-4 text-center text-sm tabular-nums">{count}x</span>
      <button
        type="button"
        aria-label="Assistir de novo"
        title="Assistir de novo"
        disabled={disabled}
        onClick={onIncrement}
        className={cn(
          "flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors",
          "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30",
        )}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
