import { and, eq, inArray } from "drizzle-orm";

import { titles, userLibrary } from "@/db/schema";
import { db } from "@/lib/db";
import { getTvDetail, type TmdbSearchResult } from "@/lib/tmdb";

/**
 * Annotates TMDb results with the two fields our UI needs that TMDb itself
 * doesn't provide: whether the signed-in user already has the title in their
 * library, and (for TV) how many seasons it has. Shared by the text-search
 * and discover routes so both result lists stay in sync.
 */
export async function annotateResults(results: TmdbSearchResult[], userId: string): Promise<TmdbSearchResult[]> {
  const tmdbIds = results.filter((r) => r.media_type !== "person").map((r) => r.id);

  const libraryKeys = new Set<string>();
  if (tmdbIds.length > 0) {
    const rows = await db
      .select({ tmdbId: titles.tmdbId, mediaType: titles.mediaType })
      .from(userLibrary)
      .innerJoin(titles, eq(userLibrary.titleId, titles.id))
      .where(and(eq(userLibrary.userId, userId), inArray(titles.tmdbId, tmdbIds)));
    for (const row of rows) libraryKeys.add(`${row.mediaType}-${row.tmdbId}`);
  }

  // Season count isn't in TMDb's search/discover response, only the full /tv
  // detail — fetch it in parallel just for the (usually few) tv results.
  const seasonCounts = new Map<number, number>();
  await Promise.all(
    results
      .filter((r) => r.media_type === "tv")
      .map(async (r) => {
        try {
          const detail = await getTvDetail(r.id);
          seasonCounts.set(r.id, detail.seasons.filter((s) => s.season_number > 0).length);
        } catch {
          // Season count is a nice-to-have; don't fail the whole list over it.
        }
      }),
  );

  return results.map((r) => ({
    ...r,
    inLibrary: r.media_type === "person" ? undefined : libraryKeys.has(`${r.media_type}-${r.id}`),
    numberOfSeasons: r.media_type === "tv" ? seasonCounts.get(r.id) : undefined,
  }));
}
