"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { EpisodeCommentComposer } from "@/components/title/episode-comment-composer";
import { EpisodeCommentItem } from "@/components/title/episode-comment-item";
import {
  deleteEpisodeComment,
  postEpisodeComment,
  toggleEpisodeCommentLike,
} from "@/lib/actions/episode-comments";
import type { EpisodeComment } from "@/lib/episode-comments";
import type { Friend } from "@/lib/friends";

interface CurrentUser {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export function EpisodeCommentsClient({
  episodeId,
  tmdbTvId,
  seasonNumber,
  episodeNumber,
  currentUser,
  canComment,
  comments,
  friends,
}: {
  episodeId: string;
  tmdbTvId: number;
  seasonNumber: number;
  episodeNumber: number;
  currentUser: CurrentUser | undefined;
  canComment: boolean;
  comments: EpisodeComment[];
  friends: Friend[];
}) {
  const router = useRouter();
  const [replyTarget, setReplyTarget] = useState<EpisodeComment | null>(null);
  const [optimisticComments, setOptimisticComments] = useState(comments);
  const [, startTransition] = useTransition();

  function handleSubmit(input: { body: string; replyToId: string | null }) {
    const replySnapshot = replyTarget
      ? { id: replyTarget.id, username: replyTarget.username, name: replyTarget.name, body: replyTarget.body }
      : null;
    setReplyTarget(null);

    startTransition(async () => {
      const created = await postEpisodeComment({ episodeId, tmdbTvId, seasonNumber, episodeNumber, ...input });
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
            likedByMe: false,
            replyTo: replySnapshot,
          },
          ...prev,
        ]);
      }
      router.refresh();
    });
  }

  function handleDelete(comment: EpisodeComment) {
    setOptimisticComments((prev) => prev.filter((c) => c.id !== comment.id));
    startTransition(async () => {
      await deleteEpisodeComment({ commentId: comment.id, tmdbTvId, seasonNumber, episodeNumber });
      router.refresh();
    });
  }

  function handleToggleLike(comment: EpisodeComment) {
    const liked = !comment.likedByMe;
    setOptimisticComments((prev) =>
      prev.map((c) =>
        c.id === comment.id ? { ...c, likedByMe: liked, likeCount: c.likeCount + (liked ? 1 : -1) } : c,
      ),
    );
    startTransition(async () => {
      await toggleEpisodeCommentLike({ commentId: comment.id, liked, tmdbTvId, seasonNumber, episodeNumber });
    });
  }

  return (
    <div className="space-y-4">
      {canComment ? (
        <EpisodeCommentComposer
          friends={friends}
          replyTarget={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
          onSubmit={handleSubmit}
        />
      ) : (
        <p className="rounded-lg border p-3 text-sm text-muted-foreground">
          Marque o episódio como assistido para poder comentar.
        </p>
      )}

      {optimisticComments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum comentário ainda — seja o primeiro.</p>
      ) : (
        <div className="space-y-3">
          {optimisticComments.map((comment) => (
            <EpisodeCommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUser?.id}
              onReply={setReplyTarget}
              onToggleLike={handleToggleLike}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
