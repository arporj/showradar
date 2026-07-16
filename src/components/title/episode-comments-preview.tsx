import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SpoilerBlur } from "@/components/title/spoiler-blur";
import type { EpisodeComment } from "@/lib/episode-comments";
import { formatRelativeTime } from "@/lib/format-date";

export function EpisodeCommentsPreview({
  comments,
  count,
  blurred,
  href,
}: {
  comments: EpisodeComment[];
  count: number;
  blurred: boolean;
  href: string;
}) {
  return (
    <div className="space-y-3">
      <Link href={href} className="flex items-center justify-between text-sm font-medium hover:underline">
        Comentários ({count})
        <ChevronRight className="size-4" />
      </Link>

      {count === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum comentário ainda — seja o primeiro.</p>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => {
            const displayName = comment.name ?? comment.username ?? "";
            return (
              <SpoilerBlur key={comment.id} blurred={blurred}>
                <div className="flex gap-3 rounded-lg border p-3">
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={comment.avatarUrl ?? undefined} alt={displayName} />
                    <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{displayName}</span>
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{comment.body}</p>
                  </div>
                </div>
              </SpoilerBlur>
            );
          })}
        </div>
      )}
    </div>
  );
}
