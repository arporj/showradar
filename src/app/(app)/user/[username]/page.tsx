import { and, desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { FollowButton } from "@/components/social/follow-button";
import { TitleCard } from "@/components/library/title-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { follows, titles as titlesTable, userLibrary, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format-date";
import { LIBRARY_STATUS_LABEL } from "@/lib/library-status";
import type { FollowStatus } from "@/lib/user-search";

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [targetUser] = await db.select().from(users).where(eq(users.username, username));
  if (!targetUser) notFound();

  const isSelf = targetUser.id === session.user.id;

  let followStatus: FollowStatus = "none";
  if (!isSelf) {
    const [relationship] = await db
      .select({ status: follows.status })
      .from(follows)
      .where(and(eq(follows.followerId, session.user.id), eq(follows.followingId, targetUser.id)));
    followStatus = relationship?.status ?? "none";
  }

  const canSeeFullLibrary = isSelf || !targetUser.isPrivate || followStatus === "accepted";

  const libraryRows = canSeeFullLibrary
    ? await db
        .select({
          titleId: titlesTable.id,
          tmdbId: titlesTable.tmdbId,
          mediaType: titlesTable.mediaType,
          name: titlesTable.name,
          posterPath: titlesTable.posterPath,
          status: userLibrary.status,
        })
        .from(userLibrary)
        .innerJoin(titlesTable, eq(userLibrary.titleId, titlesTable.id))
        .where(eq(userLibrary.userId, targetUser.id))
        .orderBy(desc(userLibrary.addedAt))
    : [];

  const displayName = targetUser.name ?? targetUser.username ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage src={targetUser.avatarUrl ?? targetUser.image ?? undefined} alt={displayName} />
          <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
          <p className="text-muted-foreground">@{targetUser.username}</p>
          <p className="text-xs text-muted-foreground">Membro desde {formatDate(targetUser.createdAt)}</p>
        </div>
        {!isSelf && (
          <FollowButton
            targetUserId={targetUser.id}
            targetUsername={targetUser.username ?? ""}
            initialStatus={followStatus}
          />
        )}
      </div>

      {canSeeFullLibrary ? (
        libraryRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada na grade ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {libraryRows.map((row) => (
              <TitleCard
                key={row.titleId}
                href={`/title/${row.mediaType}/${row.tmdbId}`}
                posterPath={row.posterPath}
                name={row.name}
              >
                <Badge variant="secondary" className="mt-1">
                  {LIBRARY_STATUS_LABEL[row.status]}
                </Badge>
              </TitleCard>
            ))}
          </div>
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          Este perfil é fechado. Siga @{targetUser.username} e aguarde aceite para ver a grade completa.
        </p>
      )}
    </div>
  );
}
