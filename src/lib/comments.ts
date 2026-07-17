// Shared shape returned by both lib/episode-comments.ts and
// lib/title-comments.ts — the query behind each is separate (different
// parent table/FK), but the UI (comment-item.tsx, comment-composer.tsx,
// comments-client.tsx) doesn't need to know which entity it's commenting on.
export type CommentReaction = "like" | "dislike";

export interface CommentReplyTo {
  id: string;
  username: string | null;
  name: string | null;
  body: string;
}

export interface Comment {
  id: string;
  userId: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  body: string;
  createdAt: Date;
  likeCount: number;
  dislikeCount: number;
  myReaction: CommentReaction | null;
  replyTo: CommentReplyTo | null;
}
