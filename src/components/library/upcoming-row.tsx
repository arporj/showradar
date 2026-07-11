import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format-date";
import { daysUntil, formatDaysUntil, type UpcomingItem } from "@/lib/upcoming";
import { tmdbImageUrl } from "@/lib/tmdb";

export function UpcomingRow({ item }: { item: UpcomingItem }) {
  const image = tmdbImageUrl(item.stillPath ?? item.posterPath, item.stillPath ? "w300" : "w185");

  return (
    <Link
      href={`/title/${item.mediaType}/${item.tmdbId}`}
      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
    >
      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded bg-muted">
        {image && <Image src={image} alt="" fill sizes="112px" className="object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.episodeLabel ? `${item.episodeLabel}${item.episodeName ? ` • ${item.episodeName}` : ""}` : "Filme"}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <Badge variant="secondary">{formatDaysUntil(daysUntil(item.nextDate))}</Badge>
        <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.nextDate)}</p>
      </div>
    </Link>
  );
}
