import { and, asc, desc, eq, sql } from "drizzle-orm";
import { cache } from "react";

import { listItems, lists, titles as titlesTable, users } from "@/db/schema";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

export type ListVisibility = "private" | "unlisted" | "public";
export type List = typeof lists.$inferSelect;

// Lazily provisions the one reserved system list every user gets on their
// first favorite — never created eagerly at signup. The try/catch (instead
// of onConflictDoNothing) sidesteps depending on Drizzle matching the
// partial unique index (lists_user_id_favorites_idx) as an upsert arbiter;
// a concurrent insert just means the catch re-reads the row the other
// request created.
export async function getOrCreateFavoritesList(userId: string): Promise<List> {
  const [existing] = await db
    .select()
    .from(lists)
    .where(and(eq(lists.userId, userId), eq(lists.isFavorites, true)));
  if (existing) return existing;

  try {
    const [created] = await db
      .insert(lists)
      .values({ userId, slug: "favoritos", title: "Favoritos", visibility: "private", isFavorites: true })
      .returning();
    return created;
  } catch {
    const [racedWith] = await db
      .select()
      .from(lists)
      .where(and(eq(lists.userId, userId), eq(lists.isFavorites, true)));
    if (!racedWith) throw new Error("Failed to create or find Favoritos list");
    return racedWith;
  }
}

export async function getUserLists(userId: string): Promise<List[]> {
  return db
    .select()
    .from(lists)
    .where(eq(lists.userId, userId))
    .orderBy(desc(lists.isFavorites), asc(lists.createdAt));
}

// Drives /lists ("minhas listas") — one query instead of N+1 per-list counts.
export async function getUserListsWithCounts(userId: string) {
  return db
    .select({
      id: lists.id,
      slug: lists.slug,
      title: lists.title,
      description: lists.description,
      visibility: lists.visibility,
      isFavorites: lists.isFavorites,
      itemCount: sql<number>`count(${listItems.id})::int`,
    })
    .from(lists)
    .leftJoin(listItems, eq(listItems.listId, lists.id))
    .where(eq(lists.userId, userId))
    .groupBy(lists.id)
    .orderBy(desc(lists.isFavorites), asc(lists.createdAt));
}

// Drives the "Adicionar à lista" dropdown on a title page — one row per list
// the user owns, flagged with whether this specific title is already in it.
export async function getUserListsWithMembership(userId: string, titleId: string) {
  return db
    .select({
      id: lists.id,
      title: lists.title,
      isFavorites: lists.isFavorites,
      hasTitle: sql<boolean>`${listItems.id} is not null`,
    })
    .from(lists)
    .leftJoin(listItems, and(eq(listItems.listId, lists.id), eq(listItems.titleId, titleId)))
    .where(eq(lists.userId, userId))
    .orderBy(desc(lists.isFavorites), asc(lists.createdAt));
}

// Wrapped in React's cache() so generateMetadata and the page component
// (both in src/app/l/[username]/[slug]/) share one DB round trip per request
// instead of two.
export const getListForView = cache(async (username: string, slug: string) => {
  const [row] = await db
    .select({
      list: lists,
      owner: {
        id: users.id,
        username: users.username,
        name: users.name,
        avatarUrl: users.avatarUrl,
        image: users.image,
      },
    })
    .from(lists)
    .innerJoin(users, eq(lists.userId, users.id))
    .where(and(eq(users.username, username), eq(lists.slug, slug)));
  return row ?? null;
});

export async function getListItemsWithTitles(listId: string) {
  return db
    .select({
      titleId: titlesTable.id,
      tmdbId: titlesTable.tmdbId,
      mediaType: titlesTable.mediaType,
      name: titlesTable.name,
      posterPath: titlesTable.posterPath,
      addedAt: listItems.addedAt,
    })
    .from(listItems)
    .innerJoin(titlesTable, eq(listItems.titleId, titlesTable.id))
    .where(eq(listItems.listId, listId))
    .orderBy(desc(listItems.addedAt));
}

// sitemap.ts — every list indexable by search engines, newest edit first.
export async function getPublicLists() {
  return db
    .select({
      username: users.username,
      slug: lists.slug,
      updatedAt: lists.updatedAt,
    })
    .from(lists)
    .innerJoin(users, eq(lists.userId, users.id))
    .where(eq(lists.visibility, "public"));
}

// "favoritos" is reserved for the system list — a custom list can never
// claim it, even before the user has favorited anything and the row exists.
export async function uniqueSlugForUser(userId: string, base: string, excludeListId?: string): Promise<string> {
  const baseSlug = slugify(base);
  let candidate = baseSlug;
  let suffix = 2;
  for (;;) {
    if (candidate === "favoritos") {
      candidate = `${baseSlug}-${suffix}`;
      suffix++;
      continue;
    }
    const [existing] = await db
      .select({ id: lists.id })
      .from(lists)
      .where(and(eq(lists.userId, userId), eq(lists.slug, candidate)));
    if (!existing || existing.id === excludeListId) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix++;
  }
}
