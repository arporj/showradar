"use client";

import { Check, Loader2, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function WatchToggleButton({
  watched,
  disabled,
  loading,
  onToggle,
  label,
  icon: Icon = Check,
  size = "default",
}: {
  watched: boolean;
  disabled?: boolean;
  loading?: boolean;
  onToggle: () => void;
  label: string;
  icon?: LucideIcon;
  size?: "default" | "lg";
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={watched}
      aria-busy={loading}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "group/watch relative flex shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40",
        size === "lg" ? "size-9" : "size-8",
        watched
          ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary/15"
          : "border-muted-foreground/30 bg-transparent hover:scale-110 hover:border-primary/60",
        !disabled && "cursor-pointer active:scale-90",
      )}
    >
      {watched && !loading && (
        <span aria-hidden className="animate-episode-check-ring absolute inset-0 rounded-full bg-primary" />
      )}
      {loading ? (
        <Loader2
          key="loading"
          aria-hidden
          className={cn("relative animate-spin stroke-[3]", size === "lg" ? "size-4.5" : "size-4")}
        />
      ) : (
        <Icon
          key={watched ? "checked" : "unchecked"}
          className={cn(
            "relative stroke-[3] transition-opacity",
            size === "lg" ? "size-4.5" : "size-4",
            watched ? "animate-episode-check-pop opacity-100" : "opacity-0 group-hover/watch:opacity-30",
          )}
        />
      )}
    </button>
  );
}
