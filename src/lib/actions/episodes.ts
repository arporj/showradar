"use server";

import { and, desc, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { episodeWatchEvents, episodes, seasons, userEpisodeProgress, userLibrary } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { LibraryStatus } from "@/lib/library-status";
import { getNextEpisodeForShow } from "@/lib/next-episode";
import { getWatchedEpisodeCounts } from "@/lib/progress";
import { todayBrDateString } from "@/lib/release-dates";
import { syncSeasonEpisodes } from "@/lib/tmdb-sync";

// Many specials/extras (season 0) come back from TMDb with no air_date at
// all — treated as already aired (rather than excluded) so bulk actions
// don't silently skip them; only a *known* future date holds an episode back.
function airedCondition() {
  return or(isNull(episodes.airDate), lte(episodes.airDate, todayBrDateString()));
}

// Keeps `user_library.status` in lockstep with actual episode progress, so
// "Assistindo"/"Assistido" are never something the user has to set by hand:
// any watched episode moves a title to "watching", finishing every episode
// moves it to "completed", and clearing every watched episode drops it back
// to "plan_to_watch". "Abandonei"/"Pausado" are the exceptions — deliberate,
// sticky choices that episode activity should never silently override.
export async function syncLibraryStatusFromProgress(userId: string, titleId: string) {
  const seasonRows = await db
    .select({ id: seasons.id, seasonNumber: seasons.seasonNumber, episodeCount: seasons.episodeCount })
    .from(seasons)
    .where(eq(seasons.titleId, titleId));

  // Season 0 is TMDb's convention for specials — extras, behind-the-scenes,
  // etc. — which don't belong to the show's actual run (same reasoning as
  // lib/next-episode.ts skipping season 0 there), so they're excluded from
  // whether the series itself counts as "completed".
  const regularSeasons = seasonRows.filter((s) => s.seasonNumber !== 0);
  const total = regularSeasons.reduce((sum, s) => sum + (s.episodeCount ?? 0), 0);

  const watchedCounts = await getWatchedEpisodeCounts(
    userId,
    seasonRows.map((s) => s.id),
  );
  const watched = regularSeasons.reduce((sum, s) => sum + (watchedCounts.get(s.id) ?? 0), 0);

  const seriesCompleted = total > 0 && watched >= total;
  const nextStatus: LibraryStatus = seriesCompleted ? "completed" : watched > 0 ? "watching" : "plan_to_watch";

  const [existing] = await db
    .select({ status: userLibrary.status })
    .from(userLibrary)
    .where(and(eq(userLibrary.userId, userId), eq(userLibrary.titleId, titleId)));

  if (existing?.status === "dropped" || existing?.status === "on_hold") return { seriesCompleted: false };

  if (!existing) {
    await db.insert(userLibrary).values({
      userId,
      titleId,
      status: nextStatus,
      watchedAt: nextStatus === "completed" ? new Date() : null,
    });
    return { seriesCompleted };
  }

  if (existing.status !== nextStatus) {
    await db
      .update(userLibrary)
      .set({ status: nextStatus, updatedAt: new Date(), watchedAt: nextStatus === "completed" ? new Date() : null })
      .where(and(eq(userLibrary.userId, userId), eq(userLibrary.titleId, titleId)));
  }

  return { seriesCompleted };
}

export async function loadSeasonEpisodes(input: {
  seasonId: string;
  titleId: string;
  tmdbTvId: number;
  seasonNumber: number;
}) {
  const session = await auth();

  await syncSeasonEpisodes(input.seasonId, input.titleId, input.tmdbTvId, input.seasonNumber);

  const episodeRows = await db
    .select()
    .from(episodes)
    .where(eq(episodes.seasonId, input.seasonId))
    .orderBy(episodes.episodeNumber);

  if (episodeRows.length === 0) return [];

  const watchedIds = session?.user
    ? new Set(
        (
          await db
            .select({ episodeId: userEpisodeProgress.episodeId })
            .from(userEpisodeProgress)
            .where(
              and(
                eq(userEpisodeProgress.userId, session.user.id),
                inArray(
                  userEpisodeProgress.episodeId,
                  episodeRows.map((e) => e.id),
                ),
              ),
            )
        ).map((row) => row.episodeId),
      )
    : new Set<string>();

  return episodeRows.map((episode) => ({ ...episode, watched: watchedIds.has(episode.id) }));
}

// Shared by every path that inserts into user_episode_progress (single
// toggle, dashboard card, bulk season/series mark). Only logs a watch event
// for rows actually inserted (.returning() omits ones that hit the conflict),
// so re-marking an already-watched episode in a bulk action never spams
// episode_watch_events with duplicate "watches" of the same episode.
async function markEpisodesWatched(userId: string, episodeIds: string[]) {
  if (episodeIds.length === 0) return;

  const inserted = await db
    .insert(userEpisodeProgress)
    .values(episodeIds.map((episodeId) => ({ userId, episodeId })))
    .onConflictDoNothing({ target: [userEpisodeProgress.userId, userEpisodeProgress.episodeId] })
    .returning({ episodeId: userEpisodeProgress.episodeId });

  if (inserted.length > 0) {
    await db.insert(episodeWatchEvents).values(inserted.map((row) => ({ userId, episodeId: row.episodeId })));
  }
}

async function writeEpisodeWatched(userId: string, episodeId: string, watched: boolean) {
  if (watched) {
    await markEpisodesWatched(userId, [episodeId]);
  } else {
    await db
      .delete(userEpisodeProgress)
      .where(and(eq(userEpisodeProgress.userId, userId), eq(userEpisodeProgress.episodeId, episodeId)));
  }
}

export async function toggleEpisodeWatched(
  episodeId: string,
  watched: boolean,
  titleId: string,
  tmdbTvId: number,
  seasonNumber?: number,
  episodeNumber?: number,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await writeEpisodeWatched(session.user.id, episodeId, watched);

  const { seriesCompleted } = await syncLibraryStatusFromProgress(session.user.id, titleId);

  revalidatePath(`/title/tv/${tmdbTvId}`);
  revalidatePath("/library");
  revalidatePath("/dashboard");
  if (seasonNumber != null && episodeNumber != null) {
    revalidatePath(`/title/tv/${tmdbTvId}/season/${seasonNumber}/episode/${episodeNumber}`);
  }

  return { seriesCompleted };
}

// Used only by the dashboard's "Continuar assistindo"/"Não iniciado" cards
// (always marks watched=true — there's no unmark affordance there).
// Deliberately does NOT revalidatePath("/dashboard"): since this action is
// called from a component rendered on /dashboard itself, doing so would make
// Next.js recompute the *entire* dashboard (every show's next-episode row,
// each with its own DB round trips and a live TMDb season sync) just to
// update the single card the user clicked. Instead, only that show's own
// next episode is recomputed and returned, so the card can update itself
// directly — see next-episode-card.tsx.
export async function markDashboardEpisodeWatched(episodeId: string, titleId: string, tmdbTvId: number) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await writeEpisodeWatched(session.user.id, episodeId, true);

  const { seriesCompleted } = await syncLibraryStatusFromProgress(session.user.id, titleId);

  revalidatePath(`/title/tv/${tmdbTvId}`);
  revalidatePath("/library");

  const nextEpisode = seriesCompleted ? null : await getNextEpisodeForShow(session.user.id, titleId, tmdbTvId);

  return { seriesCompleted, nextEpisode };
}

// Only aired episodes are affected — marking an episode that hasn't been
// released yet as "watched" doesn't make sense, regardless of which way the
// bulk toggle goes. Syncs the season's episodes first, since this can be
// called straight from the collapsed season row, before the user has ever
// expanded it (so `episodes` may not have any rows yet for this season).
export async function setSeasonWatched(input: {
  seasonId: string;
  titleId: string;
  tmdbTvId: number;
  seasonNumber: number;
  watched: boolean;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await syncSeasonEpisodes(input.seasonId, input.titleId, input.tmdbTvId, input.seasonNumber);

  const airedEpisodes = await db
    .select({ id: episodes.id })
    .from(episodes)
    .where(and(eq(episodes.seasonId, input.seasonId), airedCondition()));

  const episodeIds = airedEpisodes.map((e) => e.id);

  if (episodeIds.length > 0) {
    if (input.watched) {
      await markEpisodesWatched(session.user.id, episodeIds);
    } else {
      await db
        .delete(userEpisodeProgress)
        .where(and(eq(userEpisodeProgress.userId, session.user.id), inArray(userEpisodeProgress.episodeId, episodeIds)));
    }
  }

  await syncLibraryStatusFromProgress(session.user.id, input.titleId);

  revalidatePath(`/title/tv/${input.tmdbTvId}`);
  revalidatePath("/library");
  revalidatePath("/dashboard");

  return { airedCount: episodeIds.length };
}

// Used by the "mark previous episodes too" confirmation: marks every aired
// episode up to and including `throughEpisodeNumber` in one season. Returns
// every aired episode id at or before that number (not just newly-marked
// ones) so the client can set watched=true on all of them idempotently.
export async function markEpisodesWatchedThrough(input: {
  seasonId: string;
  titleId: string;
  tmdbTvId: number;
  seasonNumber: number;
  throughEpisodeNumber: number;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await syncSeasonEpisodes(input.seasonId, input.titleId, input.tmdbTvId, input.seasonNumber);

  const airedUpTo = await db
    .select({ id: episodes.id })
    .from(episodes)
    .where(
      and(
        eq(episodes.seasonId, input.seasonId),
        lte(episodes.episodeNumber, input.throughEpisodeNumber),
        airedCondition(),
      ),
    );

  const episodeIds = airedUpTo.map((e) => e.id);

  await markEpisodesWatched(session.user.id, episodeIds);

  await syncLibraryStatusFromProgress(session.user.id, input.titleId);

  revalidatePath(`/title/tv/${input.tmdbTvId}`);
  revalidatePath("/library");
  revalidatePath("/dashboard");

  return { watchedEpisodeIds: episodeIds };
}

// Catch-up action for a show the user already watched outside the app (or
// wants to skip ahead on) — marks every already-aired episode across every
// season watched in one go, instead of going season by season. Syncs any
// season whose episodes haven't been fetched yet first.
export async function markAllEpisodesWatched(titleId: string, tmdbTvId: number) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const seasonRows = await db
    .select({ id: seasons.id, seasonNumber: seasons.seasonNumber })
    .from(seasons)
    .where(eq(seasons.titleId, titleId));
  if (seasonRows.length === 0) return { watchedCountsBySeasonId: {} as Record<string, number> };

  await Promise.all(seasonRows.map((s) => syncSeasonEpisodes(s.id, titleId, tmdbTvId, s.seasonNumber)));

  const airedEpisodes = await db
    .select({ id: episodes.id, seasonId: episodes.seasonId })
    .from(episodes)
    .where(
      and(
        inArray(
          episodes.seasonId,
          seasonRows.map((s) => s.id),
        ),
        airedCondition(),
      ),
    );

  await markEpisodesWatched(
    session.user.id,
    airedEpisodes.map((e) => e.id),
  );

  await syncLibraryStatusFromProgress(session.user.id, titleId);

  revalidatePath(`/title/tv/${tmdbTvId}`);
  revalidatePath("/library");
  revalidatePath("/dashboard");

  const watchedCountsBySeasonId: Record<string, number> = {};
  for (const e of airedEpisodes) {
    watchedCountsBySeasonId[e.seasonId] = (watchedCountsBySeasonId[e.seasonId] ?? 0) + 1;
  }
  return { watchedCountsBySeasonId };
}

// Logs a rewatch of an episode that's already marked watched — a distinct
// action from toggleEpisodeWatched (which flips the watched/unwatched
// checkbox). Doesn't touch user_episode_progress's presence or the library
// status derivation (the episode already counted as watched); it only adds a
// new episode_watch_events row and bumps watchedAt so /history and the
// friend feed reflect the most recent watch, same as the first-time path.
export async function rewatchEpisode(
  episodeId: string,
  titleId: string,
  tmdbTvId: number,
  seasonNumber?: number,
  episodeNumber?: number,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const now = new Date();
  await db.insert(episodeWatchEvents).values({ userId: session.user.id, episodeId, watchedAt: now });
  await db
    .update(userEpisodeProgress)
    .set({ watchedAt: now })
    .where(and(eq(userEpisodeProgress.userId, session.user.id), eq(userEpisodeProgress.episodeId, episodeId)));

  revalidatePath(`/title/tv/${tmdbTvId}`);
  revalidatePath("/library");
  revalidatePath("/dashboard");
  if (seasonNumber != null && episodeNumber != null) {
    revalidatePath(`/title/tv/${tmdbTvId}/season/${seasonNumber}/episode/${episodeNumber}`);
  }
}

// Undoes the most recent watch of an episode — for fixing an accidental
// "Assistir de novo" click, not a general-purpose unwatch. Never removes the
// last remaining event: with only one watch on record, that's the episode's
// only watched/unwatched signal and belongs to toggleEpisodeWatched instead.
// user_episode_progress.watchedAt rolls back to whatever watch is now the
// most recent, instead of "now", so /history and the friend feed still show
// the actual last watch.
export async function undoEpisodeRewatch(
  episodeId: string,
  titleId: string,
  tmdbTvId: number,
  seasonNumber?: number,
  episodeNumber?: number,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const events = await db
    .select({ id: episodeWatchEvents.id, watchedAt: episodeWatchEvents.watchedAt })
    .from(episodeWatchEvents)
    .where(and(eq(episodeWatchEvents.userId, session.user.id), eq(episodeWatchEvents.episodeId, episodeId)))
    .orderBy(desc(episodeWatchEvents.watchedAt));

  if (events.length <= 1) return;

  await db.delete(episodeWatchEvents).where(eq(episodeWatchEvents.id, events[0].id));
  await db
    .update(userEpisodeProgress)
    .set({ watchedAt: events[1].watchedAt })
    .where(and(eq(userEpisodeProgress.userId, session.user.id), eq(userEpisodeProgress.episodeId, episodeId)));

  revalidatePath(`/title/tv/${tmdbTvId}`);
  revalidatePath("/library");
  revalidatePath("/dashboard");
  if (seasonNumber != null && episodeNumber != null) {
    revalidatePath(`/title/tv/${tmdbTvId}/season/${seasonNumber}/episode/${episodeNumber}`);
  }
}
