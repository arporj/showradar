"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

// Stored as an integer 1-10 (2 points per star) so half-stars are exact
// integers, not floats — display divides by 2 everywhere.
function starLabel(halfValue: number) {
  const stars = halfValue / 2;
  return `${stars % 1 === 0 ? stars : stars.toFixed(1)} de 5 estrelas`;
}

export function RatingStars({
  value,
  onChange,
  readOnly = false,
  size = "default",
}: {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "default";
}) {
  const iconSize = size === "sm" ? "size-4" : "size-6";

  return (
    <div className={cn("flex items-center gap-0.5", readOnly && "pointer-events-none")}>
      {[0, 1, 2, 3, 4].map((i) => {
        const starValue = value - i * 2;
        const fillPercent = starValue >= 2 ? 100 : starValue === 1 ? 50 : 0;

        return (
          <div key={i} className={cn("relative", iconSize)}>
            <Star className={cn(iconSize, "stroke-[1.5] text-muted-foreground/30")} />
            <div
              key={fillPercent}
              className={cn(
                "absolute inset-0 overflow-hidden",
                fillPercent > 0 && "animate-episode-check-pop",
              )}
              style={{ width: `${fillPercent}%` }}
              aria-hidden
            >
              <Star className={cn(iconSize, "shrink-0 fill-primary stroke-primary stroke-[1.5]")} />
            </div>

            {!readOnly && onChange && (
              <>
                <button
                  type="button"
                  aria-label={starLabel(i * 2 + 1)}
                  className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
                  onClick={() => onChange(i * 2 + 1)}
                />
                <button
                  type="button"
                  aria-label={starLabel(i * 2 + 2)}
                  className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
                  onClick={() => onChange(i * 2 + 2)}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
