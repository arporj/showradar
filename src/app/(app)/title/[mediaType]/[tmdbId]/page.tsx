import { and, eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/ui/back-button";
import { LibraryStatusControl } from "@/components/title/library-status-control";
import { SearchResultCard } from "@/components/search/result-card";
import { TitleRatingsSection } from "@/components/title/title-ratings-section";
import { WatchProgress } from "@/components/title/watch-progress";
import { WatchProviders } from "@/components/title/watch-providers";
import { seasons as seasonsTable, titles, userLibrary } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSimilarTitles } from "@/lib/discovery";
import { LIBRARY_STATUSES } from "@/lib/library-status";
import { getWatchedEpisodeCounts } from "@/lib/progress";
import { getTitleRatingSummary, getTitleReviews } from "@/lib/ratings";
import { tmdbImageUrl, type TmdbCastMember, type TmdbWatchProviderRegion } from "@/lib/tmdb";
import { syncTitleFromTmdb } from "@/lib/tmdb-sync";

export default async function TitleDetailPage({
  params,
}: {
  params: Promise<{ mediaType: string; tmdbId: string }>;
}) {
  const { mediaType, tmdbId } = await params;
  if (mediaType !== "movie" && mediaType !== "tv") notFound();

  const tmdbIdNum = Number(tmdbId);
  if (!Number.isInteger(tmdbIdNum)) notFound();

  let titleId: string;
  try {
    titleId = await syncTitleFromTmdb(mediaType, tmdbIdNum);
  } catch {
    notFound();
  }

  // These three only depend on titleId (or nothing), not on each other —
  // running them concurrently instead of one-after-another is what actually
  // makes the page feel responsive once the TMDb sync above is done.
  const [title, session, seasonRows] = await Promise.all([
    db
      .select()
      .from(titles)
      .where(eq(titles.id, titleId))
      .then((rows) => rows[0]),
    auth(),
    mediaType === "tv"
      ? db.select().from(seasonsTable).where(eq(seasonsTable.titleId, titleId)).orderBy(seasonsTable.seasonNumber)
      : Promise.resolve([]),
  ]);
  if (!title) notFound();

  const [libraryRows, watchedCounts, ratingSummary, reviews, similarTitles] = await Promise.all([
    session?.user
      ? db
          .select()
          .from(userLibrary)
          .where(and(eq(userLibrary.userId, session.user.id), eq(userLibrary.titleId, titleId)))
      : Promise.resolve([]),
    getWatchedEpisodeCounts(
      session?.user?.id,
      seasonRows.map((s) => s.id),
    ),
    getTitleRatingSummary(titleId),
    getTitleReviews(titleId),
    getSimilarTitles(session?.user?.id, mediaType, tmdbIdNum),
  ]);
  const libraryEntry = libraryRows[0];
  const currentStatus =
    libraryEntry && LIBRARY_STATUSES.includes(libraryEntry.status) ? libraryEntry.status : null;

  const watchedCountsObj = Object.fromEntries(watchedCounts);
  // Season 0 (specials) is excluded from the overall total — mirrors
  // lib/actions/episodes.ts::syncLibraryStatusFromProgress, so "Progresso
  // geral" and the completion celebration agree with the "Assistido" status.
  const totalEpisodes = seasonRows
    .filter((s) => s.seasonNumber !== 0)
    .reduce((sum, s) => sum + (s.episodeCount ?? 0), 0);

  const cast = (title.credits as TmdbCastMember[] | null) ?? [];
  const genres = (title.genres as { id: number; name: string }[] | null) ?? [];
  const poster = tmdbImageUrl(title.posterPath, "w500");
  const backdrop = tmdbImageUrl(title.backdropPath, "w1280");
  const year = (title.releaseDate ?? title.firstAirDate ?? "").slice(0, 4);

  return (
    <div className="space-y-8">
      {backdrop ? (
        <div className="relative -mx-6 -mt-8 h-56 overflow-hidden sm:h-72">
          <Image src={backdrop} alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute left-4 top-4">
            <BackButton className="bg-black/40 text-white hover:bg-black/60 hover:text-white" />
          </div>
        </div>
      ) : (
        <BackButton />
      )}

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="relative mx-auto h-72 w-48 shrink-0 overflow-hidden rounded-lg bg-muted sm:mx-0">
          {poster ? (
            <Image src={poster} alt={title.name} fill sizes="192px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem capa
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {title.name} {year && <span className="font-normal text-muted-foreground">({year})</span>}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mediaType === "movie" ? "Filme" : "Série"}
              {title.runtime ? ` • ${title.runtime} min` : ""}
              {genres.length > 0 ? ` • ${genres.map((g) => g.name).join(", ")}` : ""}
            </p>
          </div>

          <LibraryStatusControl
            titleId={titleId}
            currentStatus={currentStatus}
            mediaType={mediaType}
          />

          <WatchProviders providers={title.watchProvidersBr as TmdbWatchProviderRegion | null} />

          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {title.overview || "Sem sinopse disponível."}
          </p>

          {cast.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium">Elenco</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {cast.slice(0, 10).map((member) => {
                  const photo = tmdbImageUrl(member.profile_path, "w185");
                  return (
                    <Link key={member.id} href={`/person/${member.id}`} className="w-20 shrink-0 text-center">
                      <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full bg-muted">
                        {photo && (
                          <Image src={photo} alt={member.name} fill sizes="80px" className="object-cover" />
                        )}
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs">{member.name}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{member.character}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {mediaType === "tv" && seasonRows.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Temporadas</h2>
          <WatchProgress
            seasons={seasonRows}
            watchedCounts={watchedCountsObj}
            totalEpisodes={totalEpisodes}
            titleId={titleId}
            tmdbId={tmdbIdNum}
            showName={title.name}
          />
        </div>
      )}

      <TitleRatingsSection
        titleId={titleId}
        mediaType={mediaType}
        tmdbId={tmdbIdNum}
        voteAverage={title.voteAverage}
        summary={ratingSummary}
        reviews={reviews}
        currentUserId={session?.user?.id}
        currentUserRating={libraryEntry?.personalRating ?? null}
        currentUserReviewText={libraryEntry?.reviewText ?? null}
        canRate={currentStatus === "completed"}
      />

      {similarTitles.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Títulos parecidos</h2>
          <div className="space-y-3">
            {similarTitles.map((result) => (
              <SearchResultCard key={`${result.media_type}-${result.id}`} result={result} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
