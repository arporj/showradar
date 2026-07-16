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

export function EpisodeCommentsClient({
  episodeId,
  tmdbTvId,
  seasonNumber,
  episodeNumber,
  currentUserId,
  canComment,
  comments,
  friends,
}: {
  episodeId: string;
  tmdbTvId: number;
  seasonNumber: number;
  episodeNumber: number;
  currentUserId: string | undefined;
  canComment: boolean;
  comments: EpisodeComment[];
  friends: Friend[];
}) {
  const router = useRouter();
  const [replyTarget, setReplyTarget] = useState<EpisodeComment | null>(null);
  const [optimisticComments, setOptimisticComments] = useState(comments);
  const [, startTransition] = useTransition();

  function handleSubmit(input: { body: string; rating: number | null; replyToId: string | null }) {
    setReplyTarget(null);
    startTransition(async () => {
      await postEpisodeComment({ episodeId, tmdbTvId, seasonNumber, episodeNumber, ...input });
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
              currentUserId={currentUserId}
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
