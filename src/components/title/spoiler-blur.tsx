"use client";

import { EyeOff } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

// Whether to blur is decided by the caller (episode-comments-preview.tsx —
// based on days since air date), not by this component — it only knows how
// to render the blur/reveal interaction itself.
export function SpoilerBlur({ blurred, children }: { blurred: boolean; children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);

  if (!blurred || revealed) return <>{children}</>;

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none select-none blur-sm">
        {children}
      </div>
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className={cn(
          "absolute inset-0 flex items-center justify-center gap-2 rounded-md bg-background/60 text-sm font-medium text-muted-foreground",
          "hover:bg-background/70",
        )}
      >
        <EyeOff className="size-4" />
        Pode conter spoiler — toque para revelar
      </button>
    </div>
  );
}
