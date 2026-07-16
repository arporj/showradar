import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { episodeCommentLikes, episodeComments, users } from "@/db/schema";
import { db } from "@/lib/db";

export interface EpisodeCommentReplyTo {
  id: string;
  username: string | null;
  name: string | null;
  body: string;
}

export interface EpisodeComment {
  id: string;
  userId: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  body: string;
  rating: number | null;
  createdAt: Date;
  likeCount: number;
  likedByMe: boolean;
  replyTo: EpisodeCommentReplyTo | null;
}

export interface EpisodeRatingSummary {
  average: number;
  count: number;
}

async function attachDetails(
  rows: { id: string; userId: string; username: string | null; name: string | null; avatarUrl: string | null; image: string | null; body: string; rating: number | null; replyToId: string | null; createdAt: Date }[],
  currentUserId: string | undefined,
): Promise<EpisodeComment[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const replyToIds = [...new Set(rows.map((r) => r.replyToId).filter((id): id is string => id != null))];

  const [replyToRows, likeCountRows, likedByMeRows] = await Promise.all([
    replyToIds.length > 0
      ? db
          .select({
            id: episodeComments.id,
            username: users.username,
            name: users.name,
            body: episodeComments.body,
          })
          .from(episodeComments)
          .innerJoin(users, eq(episodeComments.userId, users.id))
          .where(inArray(episodeComments.id, replyToIds))
      : Promise.resolve([]),
    db
      .select({ commentId: episodeCommentLikes.commentId, count: sql<number>`count(*)::int` })
      .from(episodeCommentLikes)
      .where(inArray(episodeCommentLikes.commentId, ids))
      .groupBy(episodeCommentLikes.commentId),
    currentUserId
      ? db
          .select({ commentId: episodeCommentLikes.commentId })
          .from(episodeCommentLikes)
          .where(and(inArray(episodeCommentLikes.commentId, ids), eq(episodeCommentLikes.userId, currentUserId)))
      : Promise.resolve([]),
  ]);

  const replyToMap = new Map(replyToRows.map((r) => [r.id, r]));
  const likeCountMap = new Map(likeCountRows.map((r) => [r.commentId, r.count]));
  const likedByMeSet = new Set(likedByMeRows.map((r) => r.commentId));

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    username: row.username,
    name: row.name,
    avatarUrl: row.avatarUrl ?? row.image,
    body: row.body,
    rating: row.rating,
    createdAt: row.createdAt,
    likeCount: likeCountMap.get(row.id) ?? 0,
    likedByMe: likedByMeSet.has(row.id),
    replyTo: row.replyToId ? (replyToMap.get(row.replyToId) ?? null) : null,
  }));
}

function baseCommentQuery() {
  return db
    .select({
      id: episodeComments.id,
      userId: episodeComments.userId,
      username: users.username,
      name: users.name,
      avatarUrl: users.avatarUrl,
      image: users.image,
      body: episodeComments.body,
      rating: episodeComments.rating,
      replyToId: episodeComments.replyToId,
      createdAt: episodeComments.createdAt,
    })
    .from(episodeComments)
    .innerJoin(users, eq(episodeComments.userId, users.id));
}

// Latest N comments for the episode page's blurred preview block.
export async function getEpisodeCommentPreview(
  episodeId: string,
  currentUserId: string | undefined,
  limit = 3,
): Promise<EpisodeComment[]> {
  const rows = await baseCommentQuery()
    .where(eq(episodeComments.episodeId, episodeId))
    .orderBy(desc(episodeComments.createdAt))
    .limit(limit);

  return attachDetails(rows, currentUserId);
}

// Full, unblurred list for the dedicated /comments page.
export async function getEpisodeComments(
  episodeId: string,
  currentUserId: string | undefined,
): Promise<EpisodeComment[]> {
  const rows = await baseCommentQuery()
    .where(eq(episodeComments.episodeId, episodeId))
    .orderBy(desc(episodeComments.createdAt));

  return attachDetails(rows, currentUserId);
}

export async function getEpisodeCommentCount(episodeId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(episodeComments)
    .where(eq(episodeComments.episodeId, episodeId));
  return row?.count ?? 0;
}

// Each user's most recent rated comment on the episode counts once — someone
// who comments (and re-rates) five times shouldn't skew the average 5x.
export async function getEpisodeRatingSummary(episodeId: string): Promise<EpisodeRatingSummary | null> {
  const latestPerUser = db
    .selectDistinctOn([episodeComments.userId], {
      userId: episodeComments.userId,
      rating: episodeComments.rating,
    })
    .from(episodeComments)
    .where(and(eq(episodeComments.episodeId, episodeId), isNotNull(episodeComments.rating)))
    .orderBy(episodeComments.userId, desc(episodeComments.createdAt))
    .as("latest_per_user");

  const [row] = await db
    .select({
      average: sql<string>`avg(${latestPerUser.rating})`,
      count: sql<number>`count(*)::int`,
    })
    .from(latestPerUser);

  if (!row || row.count === 0) return null;
  return { average: Number(row.average), count: row.count };
}
