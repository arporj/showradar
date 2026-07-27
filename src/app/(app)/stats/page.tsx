import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { formatDate } from "@/lib/format-date";
import { getAvailableStatsYears, getYearStats } from "@/lib/stats";
import { tmdbImageUrl } from "@/lib/tmdb";

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const session = await auth();
  if (!session?.user) return null;
  const userId = session.user.id;

  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getUTCFullYear();
  const requestedYear = Number(yearParam);
  const year = Number.isFinite(requestedYear) && requestedYear > 0 ? requestedYear : currentYear;

  const [availableYears, stats] = await Promise.all([getAvailableStatsYears(userId), getYearStats(userId, year)]);

  const minYear = Math.min(...availableYears);
  const maxYear = Math.max(...availableYears, currentYear);
  const hasPrevYear = year > minYear;
  const hasNextYear = year < maxYear;

  const hours = Math.floor(stats.minutesWatched / 60);
  const minutes = stats.minutesWatched % 60;
  const watchedHoursLabel = minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;

  const isEmpty =
    stats.episodesWatchedCount === 0 && stats.moviesWatchedCount === 0 && stats.seriesCompleted.length === 0;

  const topGenreMinutes = stats.topGenres[0]?.minutes ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Estatísticas</h1>
          <p className="text-muted-foreground">O que você assistiu em {year}.</p>
        </div>
        <div className="flex items-center gap-1">
          <YearNavLink year={year - 1} enabled={hasPrevYear}>
            <ChevronLeft className="h-4 w-4" />
          </YearNavLink>
          <span className="min-w-12 text-center text-sm font-medium tabular-nums">{year}</span>
          <YearNavLink year={year + 1} enabled={hasNextYear}>
            <ChevronRight className="h-4 w-4" />
          </YearNavLink>
        </div>
      </div>

      {isEmpty ? (
        <p className="text-sm text-muted-foreground">Nenhuma atividade registrada em {year} ainda.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Horas assistidas" value={watchedHoursLabel} />
            <StatTile label="Episódios assistidos" value={String(stats.episodesWatchedCount)} />
            <StatTile label="Filmes assistidos" value={String(stats.moviesWatchedCount)} />
            <StatTile label="Séries concluídas" value={String(stats.seriesCompleted.length)} />
          </div>

          {stats.topGenres.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Gêneros dominantes</h2>
              <div className="space-y-3 rounded-lg border p-4">
                {stats.topGenres.map((genre) => {
                  const pct = topGenreMinutes > 0 ? Math.round((genre.minutes / topGenreMinutes) * 100) : 0;
                  return (
                    <div key={genre.name} className="flex items-center gap-3">
                      <span className="w-36 shrink-0 truncate text-sm">{genre.name}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-teal-600 dark:bg-teal-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                        {Math.round(genre.minutes / 60)}h
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {stats.topSeries.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Séries mais assistidas</h2>
              <div className="space-y-2">
                {stats.topSeries.map((series) => {
                  const poster = tmdbImageUrl(series.posterPath, "w185");
                  return (
                    <Link
                      key={series.titleId}
                      href={`/title/tv/${series.tmdbId}`}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-muted">
                        {poster && (
                          <Image src={poster} alt={series.name} fill sizes="44px" className="object-cover" />
                        )}
                      </div>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">{series.name}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {series.episodesWatched} {series.episodesWatched === 1 ? "episódio" : "episódios"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {stats.busiestDay && (
            <p className="text-sm text-muted-foreground">
              Seu dia de maior maratona foi {formatDate(stats.busiestDay.date)}, com {stats.busiestDay.episodesWatched}{" "}
              {stats.busiestDay.episodesWatched === 1 ? "episódio assistido" : "episódios assistidos"}.
            </p>
          )}

          <div className="border-t pt-6">
            <Button nativeButton={false} render={<Link href={`/stats/retrospectiva?year=${year}`}>Ver retrospectiva</Link>} />
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold">{value}</p>
    </div>
  );
}

function YearNavLink({ year, enabled, children }: { year: number; enabled: boolean; children: React.ReactNode }) {
  if (!enabled) {
    return <span className="rounded-md border p-2 opacity-40">{children}</span>;
  }
  return (
    <Link href={`/stats?year=${year}`} className="rounded-md border p-2 hover:bg-muted">
      {children}
    </Link>
  );
}
