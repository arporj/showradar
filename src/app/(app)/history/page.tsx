import { and, eq, inArray } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  episodes as episodesTable,
  seasons as seasonsTable,
  titles as titlesTable,
  userEpisodeProgress,
  userLibrary,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format-date";
import { tmdbImageUrl } from "@/lib/tmdb";

interface HistoryEntry {
  key: string;
  watchedAt: Date;
  tmdbId: number;
  mediaType: "movie" | "tv";
  name: string;
  posterPath: string | null;
  progress: { watched: number; total: number } | null;
}

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user) return null;
  const userId = session.user.id;

  const [episodeWatchRows, movieEvents] = await Promise.all([
    db
      .select({
        titleId: titlesTable.id,
        tmdbId: titlesTable.tmdbId,
        name: titlesTable.name,
        posterPath: titlesTable.posterPath,
        watchedAt: userEpisodeProgress.watchedAt,
      })
      .from(userEpisodeProgress)
      .innerJoin(episodesTable, eq(userEpisodeProgress.episodeId, episodesTable.id))
      .innerJoin(titlesTable, eq(episodesTable.titleId, titlesTable.id))
      .where(eq(userEpisodeProgress.userId, userId)),
    db
      .select({
        watchedAt: userLibrary.watchedAt,
        tmdbId: titlesTable.tmdbId,
        name: titlesTable.name,
        posterPath: titlesTable.posterPath,
      })
      .from(userLibrary)
      .innerJoin(titlesTable, eq(userLibrary.titleId, titlesTable.id))
      .where(
        and(eq(userLibrary.userId, userId), eq(titlesTable.mediaType, "movie"), eq(userLibrary.status, "completed")),
      ),
  ]);

  // Group episode-watch events by show — one card per series, not per
  // episode, with the show's most recent watch deciding where it sorts.
  const byTitle = new Map<
    string,
    { tmdbId: number; name: string; posterPath: string | null; watchedCount: number; lastWatchedAt: Date }
  >();
  for (const row of episodeWatchRows) {
    const existing = byTitle.get(row.titleId);
    if (existing) {
      existing.watchedCount += 1;
      if (row.watchedAt > existing.lastWatchedAt) existing.lastWatchedAt = row.watchedAt;
    } else {
      byTitle.set(row.titleId, {
        tmdbId: row.tmdbId,
        name: row.name,
        posterPath: row.posterPath,
        watchedCount: 1,
        lastWatchedAt: row.watchedAt,
      });
    }
  }

  const titleIds = [...byTitle.keys()];
  const seasonRows = titleIds.length
    ? await db
        .select({ titleId: seasonsTable.titleId, episodeCount: seasonsTable.episodeCount })
        .from(seasonsTable)
        .where(inArray(seasonsTable.titleId, titleIds))
    : [];
  const totalByTitle = new Map<string, number>();
  for (const s of seasonRows) {
    totalByTitle.set(s.titleId, (totalByTitle.get(s.titleId) ?? 0) + (s.episodeCount ?? 0));
  }

  const entries: HistoryEntry[] = [
    ...[...byTitle.entries()].map(([titleId, info]) => ({
      key: `title-${titleId}`,
      watchedAt: info.lastWatchedAt,
      tmdbId: info.tmdbId,
      mediaType: "tv" as const,
      name: info.name,
      posterPath: info.posterPath,
      progress: { watched: info.watchedCount, total: totalByTitle.get(titleId) ?? info.watchedCount },
    })),
    ...movieEvents
      .filter((m): m is typeof m & { watchedAt: Date } => m.watchedAt !== null)
      .map((m) => ({
        key: `movie-${m.tmdbId}`,
        watchedAt: m.watchedAt,
        tmdbId: m.tmdbId,
        mediaType: "movie" as const,
        name: m.name,
        posterPath: m.posterPath,
        progress: null,
      })),
  ].sort((a, b) => b.watchedAt.getTime() - a.watchedAt.getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
        <p className="text-muted-foreground">O que você já assistiu, do mais recente ao mais antigo.</p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Você ainda não marcou nada como assistido.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const poster = tmdbImageUrl(entry.posterPath, "w185");
            const pct =
              entry.progress && entry.progress.total > 0
                ? Math.min(100, Math.round((entry.progress.watched / entry.progress.total) * 100))
                : null;

            return (
              <Link
                key={entry.key}
                href={`/title/${entry.mediaType}/${entry.tmdbId}`}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-muted">
                  {poster && <Image src={poster} alt={entry.name} fill sizes="44px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.name}</p>
                  {entry.progress ? (
                    <div className="mt-1 flex items-center gap-2">
                      <Progress value={pct ?? 0} className="h-1 max-w-40 flex-1" />
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {entry.progress.watched}/{entry.progress.total}
                      </span>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="mt-1">
                      Filme
                    </Badge>
                  )}
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">{formatDate(entry.watchedAt)}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
