import Image from "next/image";
import Link from "next/link";

import { RatingStars } from "@/components/title/rating-stars";
import { SpoilerBlur } from "@/components/title/spoiler-blur";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/format-date";
import type { SocialActivityItem } from "@/lib/social";
import { tmdbImageUrl } from "@/lib/tmdb";
import { tmdbImageLoader } from "@/lib/tmdb-image-loader";

function actionLabel(item: SocialActivityItem) {
  if (item.kind === "rating") return "avaliou";
  return item.isReply ? "respondeu em" : "comentou em";
}

export function SocialActivityRow({ item }: { item: SocialActivityItem }) {
  const displayName = item.user.name ?? item.user.username ?? "";
  const poster = tmdbImageUrl(item.posterPath, "w185");

  return (
    <div className="flex gap-3 rounded-lg border p-3">
      <Link href={`/user/${item.user.username}`} className="shrink-0">
        <Avatar className="size-10">
          <AvatarImage src={item.user.avatarUrl ?? undefined} alt={displayName} />
          <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm">
          <Link href={`/user/${item.user.username}`} className="font-medium hover:underline">
            {displayName}
          </Link>{" "}
          {actionLabel(item)}{" "}
          <Link href={item.href} className="font-medium hover:underline">
            {item.name}
          </Link>
        </p>
        {item.seasonNumber != null && (
          <p className="truncate text-xs text-muted-foreground">
            T{item.seasonNumber}E{item.episodeNumber}
            {item.episodeName ? ` • ${item.episodeName}` : ""}
          </p>
        )}

        {item.kind === "rating" && item.rating != null && <RatingStars value={item.rating} readOnly size="sm" />}

        {item.kind === "comment" && item.body && (
          <SpoilerBlur blurred={item.spoilerBlurred}>
            <Link href={item.commentsHref} prefetch={false} className="block rounded-md bg-muted/50 p-2 hover:bg-muted">
              <p className="line-clamp-3 whitespace-pre-line break-words text-sm text-muted-foreground">{item.body}</p>
            </Link>
          </SpoilerBlur>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatRelativeTime(item.at)}</span>
          <Link href={item.commentsHref} prefetch={false} className="hover:text-foreground hover:underline">
            {item.kind === "comment" ? "Responder" : "Comentar"}
          </Link>
        </div>
      </div>

      <Link href={item.href} className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-muted">
        {poster && <Image loader={tmdbImageLoader} src={poster} alt="" fill sizes="44px" className="object-cover" />}
      </Link>
    </div>
  );
}
