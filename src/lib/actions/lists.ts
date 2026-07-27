"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { listItems, lists } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateFavoritesList, uniqueSlugForUser, type ListVisibility } from "@/lib/lists";
import type { TmdbMediaType } from "@/lib/tmdb";

export async function createList(title: string, description: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const trimmedTitle = title.trim();
  if (!trimmedTitle) return null;

  const slug = await uniqueSlugForUser(session.user.id, trimmedTitle);
  const [list] = await db
    .insert(lists)
    .values({ userId: session.user.id, slug, title: trimmedTitle, description: description.trim() || null })
    .returning({ id: lists.id, slug: lists.slug });

  revalidatePath("/lists");
  return list;
}

// Favoritos keeps its fixed title/slug — only visibility is editable for it,
// same restriction deleteList enforces for deletion.
export async function updateList(
  listId: string,
  data: { title?: string; description?: string; visibility?: ListVisibility },
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [existing] = await db.select().from(lists).where(and(eq(lists.id, listId), eq(lists.userId, session.user.id)));
  if (!existing) return;

  const wantsRename = !existing.isFavorites && data.title !== undefined && data.title.trim() !== "" && data.title.trim() !== existing.title;
  const nextTitle = wantsRename ? data.title!.trim() : existing.title;
  const nextSlug = wantsRename ? await uniqueSlugForUser(session.user.id, nextTitle, listId) : existing.slug;
  const nextDescription = existing.isFavorites
    ? existing.description
    : data.description !== undefined
      ? data.description.trim() || null
      : existing.description;

  await db
    .update(lists)
    .set({
      title: nextTitle,
      slug: nextSlug,
      description: nextDescription,
      visibility: data.visibility ?? existing.visibility,
      updatedAt: new Date(),
    })
    .where(eq(lists.id, listId));

  revalidatePath("/lists");
  if (session.user.username) {
    revalidatePath(`/l/${session.user.username}/${existing.slug}`);
    if (nextSlug !== existing.slug) revalidatePath(`/l/${session.user.username}/${nextSlug}`);
  }
  // sitemap.ts has its own 1h revalidate window (see that file) so it never
  // needs a redeploy to notice DB changes — but a list going public should
  // show up there right away for SEO, not up to an hour later.
  if (data.visibility !== undefined && data.visibility !== existing.visibility) {
    revalidatePath("/sitemap.xml");
  }
}

export async function deleteList(listId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db
    .delete(lists)
    .where(and(eq(lists.id, listId), eq(lists.userId, session.user.id), eq(lists.isFavorites, false)));

  revalidatePath("/lists");
  revalidatePath("/sitemap.xml");
}

export async function addTitleToList(listId: string, titleId: string, mediaType: TmdbMediaType, tmdbId: number) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [owned] = await db.select({ id: lists.id }).from(lists).where(and(eq(lists.id, listId), eq(lists.userId, session.user.id)));
  if (!owned) return;

  await db
    .insert(listItems)
    .values({ listId, titleId })
    .onConflictDoNothing({ target: [listItems.listId, listItems.titleId] });

  revalidatePath("/lists");
  revalidatePath(`/title/${mediaType}/${tmdbId}`);
}

export async function removeTitleFromList(listId: string, titleId: string, mediaType: TmdbMediaType, tmdbId: number) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [owned] = await db.select({ id: lists.id }).from(lists).where(and(eq(lists.id, listId), eq(lists.userId, session.user.id)));
  if (!owned) return;

  await db.delete(listItems).where(and(eq(listItems.listId, listId), eq(listItems.titleId, titleId)));

  revalidatePath("/lists");
  revalidatePath(`/title/${mediaType}/${tmdbId}`);
}

// Quick heart-icon toggle on the title page — adds/removes from the
// Favoritos list instead of the old user_library.is_favorite boolean.
export async function toggleFavorite(titleId: string, mediaType: TmdbMediaType, tmdbId: number) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const favoritesList = await getOrCreateFavoritesList(session.user.id);
  const [existing] = await db
    .select({ id: listItems.id })
    .from(listItems)
    .where(and(eq(listItems.listId, favoritesList.id), eq(listItems.titleId, titleId)));

  if (existing) {
    await db.delete(listItems).where(eq(listItems.id, existing.id));
  } else {
    await db
      .insert(listItems)
      .values({ listId: favoritesList.id, titleId })
      .onConflictDoNothing({ target: [listItems.listId, listItems.titleId] });
  }

  revalidatePath("/lists");
  revalidatePath(`/title/${mediaType}/${tmdbId}`);
  return !existing;
}
