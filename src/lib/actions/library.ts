"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { movieWatchEvents, titles as titlesTable, userLibrary } from "@/db/schema";
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

  const [existing] = await db
    .select({ status: userLibrary.status })
    .from(userLibrary)
    .where(and(eq(userLibrary.userId, session.user.id), eq(userLibrary.titleId, titleId)));

  await db
    .insert(userLibrary)
    .values({ userId: session.user.id, titleId, status: "completed", watchedAt: now })
    .onConflictDoUpdate({
      target: [userLibrary.userId, userLibrary.titleId],
      set: { status: "completed", watchedAt: now, updatedAt: now },
    });

  // Logged only for movies (TV's "assisti a série completa" shortcut skips
  // episode-level progress entirely, so it has no per-episode minutes to add
  // up anyway) and only on a genuine transition into "completed" — reclicking
  // this from search on an already-completed movie shouldn't log a rewatch.
  if (mediaType === "movie" && existing?.status !== "completed") {
    await db.insert(movieWatchEvents).values({ userId: session.user.id, titleId, watchedAt: now });
  }

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

  const now = new Date();

  // Movie rewatch tracking only applies here on a genuine transition into
  // "completed" — TV never reaches "completed" through this manual action
  // (that's always auto-derived by syncLibraryStatusFromProgress instead),
  // so in practice only movies ever hit this branch.
  if (status === "completed") {
    const [existing] = await db
      .select({ status: userLibrary.status, mediaType: titlesTable.mediaType })
      .from(userLibrary)
      .innerJoin(titlesTable, eq(userLibrary.titleId, titlesTable.id))
      .where(and(eq(userLibrary.userId, session.user.id), eq(userLibrary.titleId, titleId)));

    if (existing && existing.mediaType === "movie" && existing.status !== "completed") {
      await db.insert(movieWatchEvents).values({ userId: session.user.id, titleId, watchedAt: now });
    }
  }

  await db
    .update(userLibrary)
    .set({
      status,
      updatedAt: now,
      watchedAt: status === "completed" ? now : null,
    })
    .where(and(eq(userLibrary.userId, session.user.id), eq(userLibrary.titleId, titleId)));

  revalidatePath("/library");
  revalidatePath("/dashboard");
}

// Logs a rewatch of a movie already marked "completed" — a distinct action
// from updateLibraryStatus (whose UI never offers re-clicking the status
// already shown). Bumps watchedAt so /history and the friend feed reflect
// the most recent watch, same as the first-time completion path.
export async function rewatchMovie(titleId: string, mediaType: TmdbMediaType, tmdbId: number) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const now = new Date();
  await db.insert(movieWatchEvents).values({ userId: session.user.id, titleId, watchedAt: now });
  await db
    .update(userLibrary)
    .set({ watchedAt: now, updatedAt: now })
    .where(and(eq(userLibrary.userId, session.user.id), eq(userLibrary.titleId, titleId)));

  revalidatePath("/library");
  revalidatePath("/dashboard");
  revalidatePath(`/title/${mediaType}/${tmdbId}`);
}

// Undoes the most recent watch of a movie — for fixing an accidental
// "Assistir de novo" click, not a general "unwatch". Never removes the last
// remaining event: with only one watch on record, that's what keeps the
// title "completed" at all, and belongs to updateLibraryStatus instead.
// user_library.watchedAt rolls back to whatever watch is now the most
// recent, instead of "now", so /history and the friend feed still show the
// actual last watch.
export async function undoMovieRewatch(titleId: string, mediaType: TmdbMediaType, tmdbId: number) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const events = await db
    .select({ id: movieWatchEvents.id, watchedAt: movieWatchEvents.watchedAt })
    .from(movieWatchEvents)
    .where(and(eq(movieWatchEvents.userId, session.user.id), eq(movieWatchEvents.titleId, titleId)))
    .orderBy(desc(movieWatchEvents.watchedAt));

  if (events.length <= 1) return;

  await db.delete(movieWatchEvents).where(eq(movieWatchEvents.id, events[0].id));
  await db
    .update(userLibrary)
    .set({ watchedAt: events[1].watchedAt, updatedAt: new Date() })
    .where(and(eq(userLibrary.userId, session.user.id), eq(userLibrary.titleId, titleId)));

  revalidatePath("/library");
  revalidatePath("/dashboard");
  revalidatePath(`/title/${mediaType}/${tmdbId}`);
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
