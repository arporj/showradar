import { eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { EpisodeCommentsClient } from "@/components/title/episode-comments-client";
import { titles } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEpisodeByNumbers } from "@/lib/episode-detail";
import { getEpisodeComments, getEpisodeCommentCount } from "@/lib/episode-comments";
import { getFriends } from "@/lib/friends";
import { syncTitleFromTmdb } from "@/lib/tmdb-sync";

export default async function EpisodeCommentsPage({
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

  const [comments, count, friends] = await Promise.all([
    getEpisodeComments(episode.id, session?.user?.id),
    getEpisodeCommentCount(episode.id),
    session?.user ? getFriends(session.user.id) : Promise.resolve([]),
  ]);

  const episodeHref = `/title/tv/${tmdbIdNum}/season/${seasonNumberNum}/episode/${episodeNumberNum}`;

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <Link href={episodeHref} className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="size-4" />
          Voltar
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">
          {title.name} T{seasonNumberNum}E{episodeNumberNum}
        </h1>
        <p className="text-sm text-muted-foreground">
          {count} {count === 1 ? "comentário" : "comentários"}
        </p>
      </div>

      <EpisodeCommentsClient
        episodeId={episode.id}
        tmdbTvId={tmdbIdNum}
        seasonNumber={seasonNumberNum}
        episodeNumber={episodeNumberNum}
        currentUser={
          session?.user
            ? {
                id: session.user.id,
                username: session.user.username,
                name: session.user.name ?? null,
                avatarUrl: session.user.avatarUrl ?? session.user.image ?? null,
              }
            : undefined
        }
        canComment={watched}
        comments={comments}
        friends={friends}
      />
    </div>
  );
}
