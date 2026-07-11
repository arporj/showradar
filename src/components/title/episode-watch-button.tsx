"use client";

import { Check, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function WatchToggleButton({
  watched,
  disabled,
  onToggle,
  label,
  icon: Icon = Check,
  size = "default",
}: {
  watched: boolean;
  disabled?: boolean;
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
      {watched && (
        <span aria-hidden className="animate-episode-check-ring absolute inset-0 rounded-full bg-primary" />
      )}
      <Icon
        key={watched ? "checked" : "unchecked"}
        className={cn(
          "relative stroke-[3] transition-opacity",
          size === "lg" ? "size-4.5" : "size-4",
          watched ? "animate-episode-check-pop opacity-100" : "opacity-0 group-hover/watch:opacity-30",
        )}
      />
    </button>
  );
}
