import { eq, inArray } from "drizzle-orm";
import Papa from "papaparse";

import { seasons as seasonsTable, titles as titlesTable, userLibrary } from "@/db/schema";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format-date";
import { getWatchedEpisodeCounts } from "@/lib/progress";
import { LIBRARY_STATUS_LABEL, type LibraryStatus } from "@/lib/library-status";

interface CsvRow {
  titulo: string;
  tipo: string;
  status: string;
  nota: string;
  data_adicionado: string;
  data_assistido: string;
  episodios_assistidos: string;
  episodios_totais: string;
}

/**
 * Builds the user's whole library as a CSV string — a trust/portability
 * feature (see PROGRESS.md backlog item #1), not paginated or streamed since
 * a personal library tops out at a few hundred rows.
 */
export async function buildLibraryCsv(userId: string): Promise<string> {
  const rows = await db
    .select({
      titleId: userLibrary.titleId,
      status: userLibrary.status,
      personalRating: userLibrary.personalRating,
      addedAt: userLibrary.addedAt,
      watchedAt: userLibrary.watchedAt,
      name: titlesTable.name,
      mediaType: titlesTable.mediaType,
    })
    .from(userLibrary)
    .innerJoin(titlesTable, eq(userLibrary.titleId, titlesTable.id))
    .where(eq(userLibrary.userId, userId));

  const tvTitleIds = rows.filter((r) => r.mediaType === "tv").map((r) => r.titleId);

  const seasonRows = tvTitleIds.length
    ? await db
        .select({ titleId: seasonsTable.titleId, id: seasonsTable.id, episodeCount: seasonsTable.episodeCount })
        .from(seasonsTable)
        .where(inArray(seasonsTable.titleId, tvTitleIds))
    : [];

  const totalByTitle = new Map<string, number>();
  for (const s of seasonRows) {
    totalByTitle.set(s.titleId, (totalByTitle.get(s.titleId) ?? 0) + (s.episodeCount ?? 0));
  }

  const watchedBySeasonId = await getWatchedEpisodeCounts(
    userId,
    seasonRows.map((s) => s.id),
  );
  const watchedByTitle = new Map<string, number>();
  for (const s of seasonRows) {
    const watched = watchedBySeasonId.get(s.id) ?? 0;
    watchedByTitle.set(s.titleId, (watchedByTitle.get(s.titleId) ?? 0) + watched);
  }

  const csvRows: CsvRow[] = rows.map((row) => ({
    titulo: row.name,
    tipo: row.mediaType === "movie" ? "Filme" : "Série",
    status: LIBRARY_STATUS_LABEL[row.status as LibraryStatus] ?? row.status,
    nota: row.personalRating != null ? String(row.personalRating / 2) : "",
    data_adicionado: formatDate(row.addedAt),
    data_assistido: row.watchedAt ? formatDate(row.watchedAt) : "",
    episodios_assistidos: row.mediaType === "tv" ? String(watchedByTitle.get(row.titleId) ?? 0) : "",
    episodios_totais: row.mediaType === "tv" ? String(totalByTitle.get(row.titleId) ?? 0) : "",
  }));

  return Papa.unparse(csvRows, {
    columns: [
      "titulo",
      "tipo",
      "status",
      "nota",
      "data_adicionado",
      "data_assistido",
      "episodios_assistidos",
      "episodios_totais",
    ],
  });
}
