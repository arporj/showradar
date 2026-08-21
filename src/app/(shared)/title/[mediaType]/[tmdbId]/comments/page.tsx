import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { CommentsClient } from "@/components/title/comments-client";
import { titles, userLibrary } from "@/db/schema";
import { auth } from "@/lib/auth";
import { deleteTitleComment, postTitleComment, setTitleCommentReaction } from "@/lib/actions/title-comments";
import { db } from "@/lib/db";
import { getFriends } from "@/lib/friends";
import { getTitleComments, getTitleCommentCount } from "@/lib/title-comments";
import { syncTitleFromTmdb } from "@/lib/tmdb-sync";

export default async function TitleCommentsPage({
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

  const [title, session] = await Promise.all([
    db
      .select({ name: titles.name })
      .from(titles)
      .where(eq(titles.id, titleId))
      .then((rows) => rows[0]),
    auth(),
  ]);
  if (!title) notFound();

  const [entry, comments, count, friends] = await Promise.all([
    session?.user
      ? db
          .select({ status: userLibrary.status })
          .from(userLibrary)
          .where(and(eq(userLibrary.userId, session.user.id), eq(userLibrary.titleId, titleId)))
          .then((rows) => rows[0])
      : Promise.resolve(undefined),
    getTitleComments(titleId, session?.user?.id),
    getTitleCommentCount(titleId),
    session?.user ? getFriends(session.user.id) : Promise.resolve([]),
  ]);

  const canComment = entry?.status === "completed";
  const titleHref = `/title/${mediaType}/${tmdbIdNum}`;

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <Link href={titleHref} className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="size-4" />
          Voltar
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">{title.name}</h1>
        <p className="text-sm text-muted-foreground">
          {count} {count === 1 ? "comentário" : "comentários"}
        </p>
      </div>

      <CommentsClient
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
        canComment={canComment}
        disabledHint="Marque o título como assistido para poder comentar."
        comments={comments}
        friends={friends}
        onPost={async (input) => {
          "use server";
          return postTitleComment({ titleId, mediaType, tmdbId: tmdbIdNum, ...input });
        }}
        onDelete={async (commentId) => {
          "use server";
          await deleteTitleComment({ commentId, mediaType, tmdbId: tmdbIdNum });
        }}
        onSetReaction={async (commentId, reaction) => {
          "use server";
          await setTitleCommentReaction({ commentId, titleId, reaction, mediaType, tmdbId: tmdbIdNum });
        }}
      />
    </div>
  );
}
