"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Comment, CommentReaction } from "@/lib/comments";
import { formatRelativeTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";

const MENTION_PATTERN = /@([a-z0-9_]+)/g;

// Usernames only ever contain [a-z0-9_] (enforced at signup) — safe to treat
// any @word match as a mention link rather than needing a real user lookup.
function renderBodyWithMentions(body: string) {
  const parts = body.split(MENTION_PATTERN);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <Link key={i} href={`/user/${part}`} className="text-primary hover:underline">
        @{part}
      </Link>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onSetReaction,
  onDelete,
}: {
  comment: Comment;
  currentUserId: string | undefined;
  onReply: (comment: Comment) => void;
  onSetReaction: (comment: Comment, reaction: CommentReaction | null) => void;
  onDelete: (comment: Comment) => void;
}) {
  const displayName = comment.name ?? comment.username ?? "";

  return (
    <div className="flex gap-3 rounded-lg border p-3">
      <Link href={`/user/${comment.username}`} className="shrink-0">
        <Avatar className="size-9">
          <AvatarImage src={comment.avatarUrl ?? undefined} alt={displayName} />
          <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/user/${comment.username}`} className="text-sm font-medium hover:underline">
            {displayName}
          </Link>
          <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
        </div>

        {comment.replyTo && (
          <div className="rounded-md border-l-2 border-muted-foreground/30 bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
            Respondendo a <span className="font-medium">{comment.replyTo.name ?? comment.replyTo.username}</span>:{" "}
            {comment.replyTo.body.length > 80 ? `${comment.replyTo.body.slice(0, 80)}…` : comment.replyTo.body}
          </div>
        )}

        <p className="text-sm leading-relaxed">{renderBodyWithMentions(comment.body)}</p>

        <div className="flex items-center gap-4 pt-0.5 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => onSetReaction(comment, comment.myReaction === "like" ? null : "like")}
            className={cn("flex items-center gap-1 hover:text-foreground", comment.myReaction === "like" && "text-primary")}
          >
            <ThumbsUp className={cn("size-3.5", comment.myReaction === "like" && "fill-primary")} />
            {comment.likeCount > 0 && comment.likeCount}
          </button>
          <button
            type="button"
            onClick={() => onSetReaction(comment, comment.myReaction === "dislike" ? null : "dislike")}
            className={cn("flex items-center gap-1 hover:text-foreground", comment.myReaction === "dislike" && "text-destructive")}
          >
            <ThumbsDown className={cn("size-3.5", comment.myReaction === "dislike" && "fill-destructive")} />
            {comment.dislikeCount > 0 && comment.dislikeCount}
          </button>
          <button type="button" onClick={() => onReply(comment)} className="hover:text-foreground">
            Responder
          </button>
          {comment.userId === currentUserId && (
            <button type="button" onClick={() => onDelete(comment)} className="hover:text-destructive">
              Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
