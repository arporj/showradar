"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CommentComposer } from "@/components/title/comment-composer";
import { CommentItem } from "@/components/title/comment-item";
import type { Comment, CommentReaction } from "@/lib/comments";
import type { Friend } from "@/lib/friends";

interface CurrentUser {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export function CommentsClient({
  currentUser,
  canComment,
  disabledHint = "Marque como assistido para poder comentar.",
  comments,
  friends,
  onPost,
  onDelete,
  onSetReaction,
}: {
  currentUser: CurrentUser | undefined;
  canComment: boolean;
  disabledHint?: string;
  comments: Comment[];
  friends: Friend[];
  onPost: (input: { body: string; replyToId: string | null }) => Promise<{ id: string; createdAt: Date } | null>;
  onDelete: (commentId: string) => Promise<void>;
  onSetReaction: (commentId: string, reaction: CommentReaction | null) => Promise<void>;
}) {
  const router = useRouter();
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [optimisticComments, setOptimisticComments] = useState(comments);
  const [, startTransition] = useTransition();

  function handleSubmit(input: { body: string; replyToId: string | null }) {
    const replySnapshot = replyTarget
      ? { id: replyTarget.id, username: replyTarget.username, name: replyTarget.name, body: replyTarget.body }
      : null;
    setReplyTarget(null);

    startTransition(async () => {
      const created = await onPost(input);
      if (created && currentUser) {
        setOptimisticComments((prev) => [
          {
            id: created.id,
            userId: currentUser.id,
            username: currentUser.username,
            name: currentUser.name,
            avatarUrl: currentUser.avatarUrl,
            body: input.body,
            createdAt: created.createdAt,
            likeCount: 0,
            dislikeCount: 0,
            myReaction: null,
            replyTo: replySnapshot,
          },
          ...prev,
        ]);
      }
      router.refresh();
    });
  }

  function handleDelete(comment: Comment) {
    setOptimisticComments((prev) => prev.filter((c) => c.id !== comment.id));
    startTransition(async () => {
      await onDelete(comment.id);
      router.refresh();
    });
  }

  function handleSetReaction(comment: Comment, reaction: CommentReaction | null) {
    setOptimisticComments((prev) =>
      prev.map((c) => {
        if (c.id !== comment.id) return c;
        const likeCount = c.likeCount - (c.myReaction === "like" ? 1 : 0) + (reaction === "like" ? 1 : 0);
        const dislikeCount = c.dislikeCount - (c.myReaction === "dislike" ? 1 : 0) + (reaction === "dislike" ? 1 : 0);
        return { ...c, myReaction: reaction, likeCount, dislikeCount };
      }),
    );
    startTransition(async () => {
      await onSetReaction(comment.id, reaction);
    });
  }

  return (
    <div className="space-y-4">
      {canComment ? (
        <CommentComposer
          friends={friends}
          replyTarget={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
          onSubmit={handleSubmit}
        />
      ) : (
        <p className="rounded-lg border p-3 text-sm text-muted-foreground">{disabledHint}</p>
      )}

      {optimisticComments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum comentário ainda — seja o primeiro.</p>
      ) : (
        <div className="space-y-3">
          {optimisticComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUser?.id}
              onReply={setReplyTarget}
              onSetReaction={handleSetReaction}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
