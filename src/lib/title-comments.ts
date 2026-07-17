import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { titleCommentReactions, titleComments, users } from "@/db/schema";
import { db } from "@/lib/db";
import type { Comment } from "@/lib/comments";

async function attachDetails(
  rows: { id: string; userId: string; username: string | null; name: string | null; avatarUrl: string | null; image: string | null; body: string; replyToId: string | null; createdAt: Date }[],
  currentUserId: string | undefined,
): Promise<Comment[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const replyToIds = [...new Set(rows.map((r) => r.replyToId).filter((id): id is string => id != null))];

  const [replyToRows, reactionCountRows, myReactionRows] = await Promise.all([
    replyToIds.length > 0
      ? db
          .select({
            id: titleComments.id,
            username: users.username,
            name: users.name,
            body: titleComments.body,
          })
          .from(titleComments)
          .innerJoin(users, eq(titleComments.userId, users.id))
          .where(inArray(titleComments.id, replyToIds))
      : Promise.resolve([]),
    db
      .select({
        commentId: titleCommentReactions.commentId,
        type: titleCommentReactions.type,
        count: sql<number>`count(*)::int`,
      })
      .from(titleCommentReactions)
      .where(inArray(titleCommentReactions.commentId, ids))
      .groupBy(titleCommentReactions.commentId, titleCommentReactions.type),
    currentUserId
      ? db
          .select({ commentId: titleCommentReactions.commentId, type: titleCommentReactions.type })
          .from(titleCommentReactions)
          .where(and(inArray(titleCommentReactions.commentId, ids), eq(titleCommentReactions.userId, currentUserId)))
      : Promise.resolve([]),
  ]);

  const replyToMap = new Map(replyToRows.map((r) => [r.id, r]));
  const likeCountMap = new Map<string, number>();
  const dislikeCountMap = new Map<string, number>();
  for (const row of reactionCountRows) {
    (row.type === "like" ? likeCountMap : dislikeCountMap).set(row.commentId, row.count);
  }
  const myReactionMap = new Map(myReactionRows.map((r) => [r.commentId, r.type]));

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    username: row.username,
    name: row.name,
    avatarUrl: row.avatarUrl ?? row.image,
    body: row.body,
    createdAt: row.createdAt,
    likeCount: likeCountMap.get(row.id) ?? 0,
    dislikeCount: dislikeCountMap.get(row.id) ?? 0,
    myReaction: myReactionMap.get(row.id) ?? null,
    replyTo: row.replyToId ? (replyToMap.get(row.replyToId) ?? null) : null,
  }));
}

function baseCommentQuery() {
  return db
    .select({
      id: titleComments.id,
      userId: titleComments.userId,
      username: users.username,
      name: users.name,
      avatarUrl: users.avatarUrl,
      image: users.image,
      body: titleComments.body,
      replyToId: titleComments.replyToId,
      createdAt: titleComments.createdAt,
    })
    .from(titleComments)
    .innerJoin(users, eq(titleComments.userId, users.id));
}

// Latest N comments for the title page's blurred preview block.
export async function getTitleCommentPreview(
  titleId: string,
  currentUserId: string | undefined,
  limit = 3,
): Promise<Comment[]> {
  const rows = await baseCommentQuery()
    .where(eq(titleComments.titleId, titleId))
    .orderBy(desc(titleComments.createdAt))
    .limit(limit);

  return attachDetails(rows, currentUserId);
}

// Full, unblurred list for the dedicated /comments page.
export async function getTitleComments(titleId: string, currentUserId: string | undefined): Promise<Comment[]> {
  const rows = await baseCommentQuery()
    .where(eq(titleComments.titleId, titleId))
    .orderBy(desc(titleComments.createdAt));

  return attachDetails(rows, currentUserId);
}

export async function getTitleCommentCount(titleId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(titleComments)
    .where(eq(titleComments.titleId, titleId));
  return row?.count ?? 0;
}
