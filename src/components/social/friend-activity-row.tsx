import Image from "next/image";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EpisodeGroupToggle } from "@/components/social/episode-group-toggle";
import { RatingStars } from "@/components/title/rating-stars";
import type { FriendActivityItem } from "@/lib/feed";
import { formatDate } from "@/lib/format-date";
import { tmdbImageUrl } from "@/lib/tmdb";

export function FriendActivityRow({ item }: { item: FriendActivityItem }) {
  const displayName = item.user.name ?? item.user.username ?? "";
  const poster = tmdbImageUrl(item.posterPath, "w185");
  const titleHref = `/title/${item.mediaType}/${item.tmdbId}`;

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Link href={`/user/${item.user.username}`} className="shrink-0">
        <Avatar className="size-10">
          <AvatarImage src={item.user.avatarUrl ?? undefined} alt={displayName} />
          <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <Link href={`/user/${item.user.username}`} className="font-medium hover:underline">
            {displayName}
          </Link>{" "}
          {item.type === "episode" ? "assistiu" : item.type === "rating" ? "avaliou" : "concluiu"}{" "}
          <Link href={titleHref} className="font-medium hover:underline">
            {item.name}
          </Link>
        </p>
        {item.type === "episode" && (
          <>
            <p className="truncate text-xs text-muted-foreground">
              T{item.seasonNumber}E{item.episodeNumber}
              {item.episodeName ? ` • ${item.episodeName}` : ""}
            </p>
            {item.moreEpisodes.length > 0 && <EpisodeGroupToggle episodes={item.moreEpisodes} />}
          </>
        )}
        {item.type === "rating" && item.rating != null && (
          <div className="flex items-center gap-2">
            <RatingStars value={item.rating} readOnly size="sm" />
          </div>
        )}
        <p className="text-xs text-muted-foreground">{formatDate(item.watchedAt)}</p>
      </div>

      <Link href={titleHref} className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-muted">
        {poster && <Image src={poster} alt="" fill sizes="44px" className="object-cover" />}
      </Link>
    </div>
  );
}
