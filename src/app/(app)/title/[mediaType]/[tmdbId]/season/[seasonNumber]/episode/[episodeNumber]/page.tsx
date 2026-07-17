import { eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { CommentsPreview } from "@/components/title/comments-preview";
import { EpisodePageWatchToggle } from "@/components/title/episode-page-watch-toggle";
import { RatingForm } from "@/components/title/rating-form";
import { titles } from "@/db/schema";
import { auth } from "@/lib/auth";
import { deleteEpisodeRating, submitEpisodeRating } from "@/lib/actions/episode-ratings";
import { db } from "@/lib/db";
import { getEpisodeByNumbers } from "@/lib/episode-detail";
import { getEpisodeCommentPreview, getEpisodeCommentCount } from "@/lib/episode-comments";
import { getEpisodeRatingSummary, getUserEpisodeRating } from "@/lib/episode-ratings";
import { formatDate } from "@/lib/format-date";
import { shiftDateString, todayBrDateString } from "@/lib/release-dates";
import { syncTitleFromTmdb } from "@/lib/tmdb-sync";
import { tmdbImageUrl } from "@/lib/tmdb";

// Preview comments stay blurred until this many days after the episode airs
// — long enough for weekly watchers to catch up before spoilers show up
// unprompted on the episode page (the full /comments list is never blurred).
const SPOILER_PREVIEW_WINDOW_DAYS = 2;

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ mediaType: string; tmdbId: string; seasonNumber: string; episodeNumber: string }>;
}) {
  const { mediaType, tmdbId, seasonNumber, episodeNumber } = await params;
  if (mediaType !== "tv") notFound();

  const tmdbIdNum = Number(tmdbId);
  const seasonNumberNum = Number(seasonNumber);
  const episodeNumberNum = Number(episodeNumber);
  if (![tmdbIdNum, seasonNumberNum, episodeNumberNum].every(Number.isInteger)) notFound();

  let titleId: string;
  try {
    titleId = await syncTitleFromTmdb("tv", tmdbIdNum);
  } catch {
    notFound();
  }

  const [title, session] = await Promise.all([
    db
      .select({ name: titles.name })
      .from(titles)
      .where(eq(titles.id, titleId))
      .then((rows) => rows[0]),
    auth(),
  ]);
  if (!title) notFound();

  const result = await getEpisodeByNumbers({
    titleId,
    tmdbTvId: tmdbIdNum,
    seasonNumber: seasonNumberNum,
    episodeNumber: episodeNumberNum,
    userId: session?.user?.id,
  });
  if (!result) notFound();
  const { episode, watched } = result;

  const [commentPreview, commentCount, ratingSummary, userRating] = await Promise.all([
    getEpisodeCommentPreview(episode.id, session?.user?.id),
    getEpisodeCommentCount(episode.id),
    getEpisodeRatingSummary(episode.id),
    session?.user ? getUserEpisodeRating(episode.id, session.user.id) : Promise.resolve(null),
  ]);

  const aired = !episode.airDate || episode.airDate <= todayBrDateString();
  const still = tmdbImageUrl(episode.stillPath, "w780");
  const commentsHref = `/title/tv/${tmdbIdNum}/season/${seasonNumberNum}/episode/${episodeNumberNum}/comments`;
  const spoilerCutoff = episode.airDate ? shiftDateString(episode.airDate, SPOILER_PREVIEW_WINDOW_DAYS) : null;
  const previewBlurred = spoilerCutoff != null && todayBrDateString() < spoilerCutoff;

  return (
    <div className="space-y-6">
      <div className="relative -mx-6 -mt-8 aspect-video overflow-hidden bg-muted sm:aspect-[21/9]">
        {still && <Image src={still} alt="" fill className="object-cover" priority />}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <Link
          href={`/title/tv/${tmdbIdNum}`}
          className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-sm text-white hover:bg-black/60"
        >
          <ArrowLeft className="size-4" />
          {title.name}
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {episode.episodeNumber}. {episode.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Temporada {seasonNumberNum}
              {episode.airDate ? ` • ${formatDate(episode.airDate)}` : ""}
              {episode.runtime ? ` • ${episode.runtime} min` : ""}
              {episode.voteAverage != null ? ` • ${Number(episode.voteAverage).toFixed(1)}/10 (TMDb)` : ""}
            </p>
          </div>
          <EpisodePageWatchToggle
            episodeId={episode.id}
            titleId={titleId}
            tmdbTvId={tmdbIdNum}
            seasonNumber={seasonNumberNum}
            episodeNumber={episodeNumberNum}
            initialWatched={watched}
            aired={aired}
          />
        </div>

        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {episode.overview || "Sem sinopse disponível."}
        </p>

        <div className="flex flex-wrap items-end gap-6">
          {ratingSummary && (
            <div>
              <p className="text-xs text-muted-foreground">Nota ShowRadar</p>
              <p className="text-sm font-medium">
                {(ratingSummary.average / 2).toFixed(1)}/5 ({ratingSummary.count}{" "}
                {ratingSummary.count === 1 ? "avaliação" : "avaliações"})
              </p>
            </div>
          )}

          {watched ? (
            <RatingForm
              initialRating={userRating}
              onChange={async (rating) => {
                "use server";
                await submitEpisodeRating({
                  episodeId: episode.id,
                  tmdbTvId: tmdbIdNum,
                  seasonNumber: seasonNumberNum,
                  episodeNumber: episodeNumberNum,
                  rating,
                });
              }}
              onDelete={async () => {
                "use server";
                await deleteEpisodeRating({
                  episodeId: episode.id,
                  tmdbTvId: tmdbIdNum,
                  seasonNumber: seasonNumberNum,
                  episodeNumber: episodeNumberNum,
                });
              }}
            />
          ) : (
            <p className="text-xs text-muted-foreground">Marque como assistido para avaliar.</p>
          )}
        </div>

        <CommentsPreview comments={commentPreview} count={commentCount} blurred={previewBlurred} href={commentsHref} />
      </div>
    </div>
  );
}
