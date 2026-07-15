"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { userLibrary } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { LibraryStatus } from "@/lib/library-status";
import type { TmdbMediaType } from "@/lib/tmdb";
import { syncTitleFromTmdb } from "@/lib/tmdb-sync";

export async function addTitleToLibrary(mediaType: TmdbMediaType, tmdbId: number) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const titleId = await syncTitleFromTmdb(mediaType, tmdbId);

  await db
    .insert(userLibrary)
    .values({ userId: session.user.id, titleId, status: "plan_to_watch" })
    .onConflictDoNothing({ target: [userLibrary.userId, userLibrary.titleId] });

  revalidatePath("/library");
  revalidatePath("/dashboard");
  revalidatePath(`/title/${mediaType}/${tmdbId}`);
}

// Combo da busca: adiciona à grade já com status "Assistido". Se o título
// já estiver na grade, promove o status para completed em vez de ignorar o
// clique — é o que o usuário pediu ao apertar "Assistido".
export async function addTitleToLibraryAsWatched(mediaType: TmdbMediaType, tmdbId: number) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const titleId = await syncTitleFromTmdb(mediaType, tmdbId);
  const now = new Date();

  await db
    .insert(userLibrary)
    .values({ userId: session.user.id, titleId, status: "completed", watchedAt: now })
    .onConflictDoUpdate({
      target: [userLibrary.userId, userLibrary.titleId],
      set: { status: "completed", watchedAt: now, updatedAt: now },
    });

  revalidatePath("/library");
  revalidatePath("/dashboard");
  revalidatePath(`/title/${mediaType}/${tmdbId}`);
}

// For contexts where the title was already synced moments ago (e.g. the
// detail page just rendered it) — skips the TMDb round-trip that
// addTitleToLibrary needs when it can't assume the cache is already warm.
export async function addExistingTitleToLibrary(titleId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db
    .insert(userLibrary)
    .values({ userId: session.user.id, titleId, status: "plan_to_watch" })
    .onConflictDoNothing({ target: [userLibrary.userId, userLibrary.titleId] });

  revalidatePath("/library");
  revalidatePath("/dashboard");
}

export async function updateLibraryStatus(titleId: string, status: LibraryStatus) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db
    .update(userLibrary)
    .set({
      status,
      updatedAt: new Date(),
      watchedAt: status === "completed" ? new Date() : null,
    })
    .where(and(eq(userLibrary.userId, session.user.id), eq(userLibrary.titleId, titleId)));

  revalidatePath("/library");
  revalidatePath("/dashboard");
}

export async function removeFromLibrary(titleId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db
    .delete(userLibrary)
    .where(and(eq(userLibrary.userId, session.user.id), eq(userLibrary.titleId, titleId)));

  revalidatePath("/library");
  revalidatePath("/dashboard");
}
