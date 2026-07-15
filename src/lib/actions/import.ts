"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { episodes, importJobItems, importJobs, seasons, userEpisodeProgress, userLibrary } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncLibraryStatusFromProgress } from "@/lib/actions/episodes";
import { parseTvTimeExport, TvTimeExportError, type ParsedImportItem } from "@/lib/import/tv-time";
import { searchMovieFuzzy, searchTvFuzzy, type TmdbSearchResult } from "@/lib/tmdb";
import { syncTitleFromTmdb, syncSeasonEpisodes } from "@/lib/tmdb-sync";

const MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024;
const BATCH_SIZE = 8;
// TMDb text search returns results ordered by relevance, not popularity —
// only the top few are worth considering for the year-match heuristic below.
const CANDIDATE_POOL_SIZE = 5;

export async function startTvTimeImport(formData: FormData): Promise<{ error: string } | { jobId: string }> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Nenhum arquivo enviado" };
  }
  if (!file.name.toLowerCase().endsWith(".zip")) {
    return { error: "Envie o arquivo .zip da exportação do TV Time" };
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return { error: "O arquivo deve ter no máximo 15MB" };
  }

  let items: ParsedImportItem[];
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    items = parseTvTimeExport(bytes);
  } catch (err) {
    if (err instanceof TvTimeExportError) return { error: err.message };
    console.error("Failed to parse TV Time export", err);
    return { error: "Não foi possível ler o arquivo enviado." };
  }

  if (items.length === 0) {
    return { error: "Nenhum título encontrado no arquivo." };
  }

  const [job] = await db
    .insert(importJobs)
    .values({ userId: session.user.id, source: "tv_time", status: "processing", totalItems: items.length })
    .returning({ id: importJobs.id });

  await db
    .insert(importJobItems)
    .values(
      items.map((item) => ({
        jobId: job.id,
        rawTitle: item.rawTitle,
        canonicalKey: item.canonicalKey,
        mediaType: item.mediaType,
        yearHint: item.yearHint,
        episodesJson: item.mediaType === "tv" ? item.episodes : null,
        movieWatchedAt: item.movieWatchedAt ? new Date(item.movieWatchedAt) : null,
        status: "pending" as const,
      })),
    )
    .onConflictDoNothing({ target: [importJobItems.jobId, importJobItems.canonicalKey, importJobItems.mediaType] });

  return { jobId: job.id };
}

function candidateYear(result: TmdbSearchResult, mediaType: "movie" | "tv") {
  const raw = mediaType === "movie" ? result.release_date : result.first_air_date;
  const year = raw ? Number(raw.slice(0, 4)) : NaN;
  return Number.isFinite(year) ? year : null;
}

function pickCandidate(results: TmdbSearchResult[], yearHint: number | null, mediaType: "movie" | "tv") {
  const pool = results.slice(0, CANDIDATE_POOL_SIZE);
  if (pool.length === 0) return null;
  if (yearHint) {
    const yearMatch = pool.find((r) => {
      const year = candidateYear(r, mediaType);
      return year != null && Math.abs(year - yearHint) <= 1;
    });
    if (yearMatch) return yearMatch;
  }
  return pool[0];
}

interface ItemWriteResult {
  status: "matched" | "unmatched" | "error";
  tmdbId?: number;
  titleId?: string;
  errorMessage?: string;
}

// Movie/show found, but never actually watched (only followed/planned in the
// source) — added without a watched date, upgrade-only via onConflictDoNothing
// so it never overwrites a status the user already set some other way.
async function addPlanToWatch(userId: string, titleId: string) {
  await db
    .insert(userLibrary)
    .values({ userId, titleId, status: "plan_to_watch" })
    .onConflictDoNothing({ target: [userLibrary.userId, userLibrary.titleId] });
}

async function upsertWatchedMovie(userId: string, titleId: string, watchedAt: Date) {
  const [existing] = await db
    .select({ status: userLibrary.status })
    .from(userLibrary)
    .where(and(eq(userLibrary.userId, userId), eq(userLibrary.titleId, titleId)));

  if (!existing) {
    await db
      .insert(userLibrary)
      .values({ userId, titleId, status: "completed", watchedAt })
      .onConflictDoNothing({ target: [userLibrary.userId, userLibrary.titleId] });
    return;
  }

  // "dropped"/"completed" are sticky — an import catching up on history
  // should never downgrade a status the user already settled on.
  if (existing.status === "dropped" || existing.status === "completed") return;

  await db
    .update(userLibrary)
    .set({ status: "completed", watchedAt, updatedAt: new Date() })
    .where(and(eq(userLibrary.userId, userId), eq(userLibrary.titleId, titleId)));
}

async function writeTvItem(
  userId: string,
  titleId: string,
  tmdbId: number,
  tuples: { seasonNumber: number; episodeNumber: number; watchedAt: string }[],
) {
  if (tuples.length === 0) {
    await addPlanToWatch(userId, titleId);
    return;
  }

  const seasonNumbers = [...new Set(tuples.map((t) => t.seasonNumber))];
  const seasonRows = await db
    .select({ id: seasons.id, seasonNumber: seasons.seasonNumber })
    .from(seasons)
    .where(and(eq(seasons.titleId, titleId), inArray(seasons.seasonNumber, seasonNumbers)));
  const seasonIdByNumber = new Map(seasonRows.map((s) => [s.seasonNumber, s.id]));

  // A season number from the import with no matching TMDb season (numbering
  // mismatch between sources) is skipped, not an error — the rest of the
  // show still imports.
  await Promise.all(
    seasonRows.map((s) => syncSeasonEpisodes(s.id, titleId, tmdbId, s.seasonNumber)),
  );

  const episodeRows = seasonRows.length
    ? await db
        .select({ id: episodes.id, seasonId: episodes.seasonId, episodeNumber: episodes.episodeNumber })
        .from(episodes)
        .where(inArray(episodes.seasonId, seasonRows.map((s) => s.id)))
    : [];
  const episodeIdByKey = new Map(episodeRows.map((e) => [`${e.seasonId}-${e.episodeNumber}`, e.id]));

  const progressValues: { userId: string; episodeId: string; watchedAt: Date }[] = [];
  for (const tuple of tuples) {
    const seasonId = seasonIdByNumber.get(tuple.seasonNumber);
    if (!seasonId) continue;
    const episodeId = episodeIdByKey.get(`${seasonId}-${tuple.episodeNumber}`);
    if (!episodeId) continue;
    progressValues.push({ userId, episodeId, watchedAt: new Date(tuple.watchedAt) });
  }

  if (progressValues.length > 0) {
    await db
      .insert(userEpisodeProgress)
      .values(progressValues)
      .onConflictDoNothing({ target: [userEpisodeProgress.userId, userEpisodeProgress.episodeId] });
  }

  await syncLibraryStatusFromProgress(userId, titleId);
}

async function matchAndWriteItem(
  userId: string,
  item: {
    rawTitle: string;
    mediaType: "movie" | "tv";
    yearHint: number | null;
    episodesJson: { seasonNumber: number; episodeNumber: number; watchedAt: string }[] | null;
    movieWatchedAt: Date | null;
  },
): Promise<ItemWriteResult> {
  try {
    const search = item.mediaType === "movie" ? await searchMovieFuzzy(item.rawTitle) : await searchTvFuzzy(item.rawTitle);
    const candidate = pickCandidate(search.results, item.yearHint, item.mediaType);
    if (!candidate) return { status: "unmatched" };

    const titleId = await syncTitleFromTmdb(item.mediaType, candidate.id);

    if (item.mediaType === "movie") {
      if (item.movieWatchedAt) {
        await upsertWatchedMovie(userId, titleId, item.movieWatchedAt);
      } else {
        await addPlanToWatch(userId, titleId);
      }
    } else {
      await writeTvItem(userId, titleId, candidate.id, item.episodesJson ?? []);
    }

    return { status: "matched", tmdbId: candidate.id, titleId };
  } catch (err) {
    console.error("Failed to import item", item.rawTitle, err);
    return { status: "error", errorMessage: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

interface BatchTotals {
  totalItems: number;
  processedItems: number;
  matchedItems: number;
  unmatchedItems: number;
  errorItems: number;
}

export async function processImportBatch(
  jobId: string,
): Promise<{ error: string } | { done: boolean; totals: BatchTotals; jobStatus: string }> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [job] = await db
    .select()
    .from(importJobs)
    .where(and(eq(importJobs.id, jobId), eq(importJobs.userId, session.user.id)));
  if (!job) return { error: "not_found" };

  if (job.status !== "processing") {
    return {
      done: true,
      jobStatus: job.status,
      totals: {
        totalItems: job.totalItems,
        processedItems: job.processedItems,
        matchedItems: job.matchedItems,
        unmatchedItems: job.unmatchedItems,
        errorItems: job.errorItems,
      },
    };
  }

  // Claim the next batch inside a transaction so two tabs polling the same
  // job at once never grab the same rows. inArray() with an empty id list is
  // a safe no-op in Drizzle, so the zero-pending case needs no special case.
  const claimed = await db.transaction(async (tx) => {
    const pending = await tx
      .select({ id: importJobItems.id })
      .from(importJobItems)
      .where(and(eq(importJobItems.jobId, jobId), eq(importJobItems.status, "pending")))
      .orderBy(asc(importJobItems.createdAt))
      .limit(BATCH_SIZE);

    const ids = pending.map((p) => p.id);

    await tx.update(importJobItems).set({ status: "processing" }).where(inArray(importJobItems.id, ids));

    return tx.select().from(importJobItems).where(inArray(importJobItems.id, ids));
  });

  if (claimed.length > 0) {
    const results = await Promise.all(claimed.map((item) => matchAndWriteItem(session.user.id, item)));

    await Promise.all(
      claimed.map((item, i) =>
        db
          .update(importJobItems)
          .set({
            status: results[i].status,
            tmdbId: results[i].tmdbId ?? null,
            titleId: results[i].titleId ?? null,
            errorMessage: results[i].errorMessage ?? null,
            processedAt: new Date(),
          })
          .where(eq(importJobItems.id, item.id)),
      ),
    );

    const matchedDelta = results.filter((r) => r.status === "matched").length;
    const unmatchedDelta = results.filter((r) => r.status === "unmatched").length;
    const errorDelta = results.filter((r) => r.status === "error").length;

    await db
      .update(importJobs)
      .set({
        processedItems: sql`${importJobs.processedItems} + ${claimed.length}`,
        matchedItems: sql`${importJobs.matchedItems} + ${matchedDelta}`,
        unmatchedItems: sql`${importJobs.unmatchedItems} + ${unmatchedDelta}`,
        errorItems: sql`${importJobs.errorItems} + ${errorDelta}`,
        updatedAt: new Date(),
      })
      .where(eq(importJobs.id, jobId));
  }

  const [remaining] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(importJobItems)
    .where(and(eq(importJobItems.jobId, jobId), eq(importJobItems.status, "pending")));

  const [refreshed] = await db.select().from(importJobs).where(eq(importJobs.id, jobId));
  const done = (remaining?.count ?? 0) === 0;

  if (done && refreshed.status === "processing") {
    const finalStatus = refreshed.errorItems > 0 ? "completed_with_errors" : "completed";
    await db
      .update(importJobs)
      .set({ status: finalStatus, completedAt: new Date() })
      .where(eq(importJobs.id, jobId));
    refreshed.status = finalStatus;
  }

  return {
    done,
    jobStatus: refreshed.status,
    totals: {
      totalItems: refreshed.totalItems,
      processedItems: refreshed.processedItems,
      matchedItems: refreshed.matchedItems,
      unmatchedItems: refreshed.unmatchedItems,
      errorItems: refreshed.errorItems,
    },
  };
}
