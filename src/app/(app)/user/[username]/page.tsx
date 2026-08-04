import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { GradeSections, type GradeRow } from "@/components/library/grade-sections";
import { FollowButton } from "@/components/social/follow-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { follows, titles as titlesTable, userLibrary, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserProvisionalRatingSummaries } from "@/lib/episode-ratings";
import { formatDate } from "@/lib/format-date";
import { isLibraryStatus, LIBRARY_STATUS_LABEL, type LibraryStatus } from "@/lib/library-status";
import { getEffectiveRating, isRatingFilterValue, RATING_FILTERS } from "@/lib/rating-filter";
import { todayBrDateString } from "@/lib/release-dates";
import type { FollowStatus } from "@/lib/user-search";
import { cn } from "@/lib/utils";

type MediaTab = "tv" | "movie";

const MEDIA_TABS: { value: MediaTab; label: string }[] = [
  { value: "tv", label: "Séries" },
  { value: "movie", label: "Filmes" },
];

const STATUS_FILTERS: { value: LibraryStatus | undefined; label: string }[] = [
  { value: undefined, label: "Tudo" },
  { value: "plan_to_watch", label: LIBRARY_STATUS_LABEL.plan_to_watch },
  { value: "watching", label: LIBRARY_STATUS_LABEL.watching },
  { value: "on_hold", label: LIBRARY_STATUS_LABEL.on_hold },
  { value: "completed", label: LIBRARY_STATUS_LABEL.completed },
  { value: "dropped", label: LIBRARY_STATUS_LABEL.dropped },
];

function profileHref(username: string, mediaType: MediaTab, status?: LibraryStatus, minRating?: number) {
  const params = new URLSearchParams();
  if (mediaType === "movie") params.set("type", "movie");
  if (status) params.set("status", status);
  if (minRating) params.set("minRating", String(minRating));
  const query = params.toString();
  return query ? `/user/${username}?${query}` : `/user/${username}`;
}

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ type?: string; status?: string; minRating?: string }>;
}) {
  const { username } = await params;
  const { type, status, minRating: minRatingParam } = await searchParams;
  const mediaType: MediaTab = type === "movie" ? "movie" : "tv";
  const statusFilter = isLibraryStatus(status) ? status : undefined;
  const parsedMinRating = minRatingParam ? Number(minRatingParam) : undefined;
  const minRating = isRatingFilterValue(parsedMinRating) ? parsedMinRating : undefined;

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

  const conditions = [eq(userLibrary.userId, targetUser.id), eq(titlesTable.mediaType, mediaType)];
  if (statusFilter) conditions.push(eq(userLibrary.status, statusFilter));

  const libraryRows = canSeeFullLibrary
    ? await db
        .select({
          titleId: titlesTable.id,
          tmdbId: titlesTable.tmdbId,
          mediaType: titlesTable.mediaType,
          name: titlesTable.name,
          posterPath: titlesTable.posterPath,
          status: userLibrary.status,
          personalRating: userLibrary.personalRating,
        })
        .from(userLibrary)
        .innerJoin(titlesTable, eq(userLibrary.titleId, titlesTable.id))
        .where(and(...conditions))
        .orderBy(desc(userLibrary.addedAt))
    : [];

  // Series mid-watch (or paused, which is the same "not finished yet" state)
  // don't have a final rating yet — episodes already rated stand in as a
  // provisional one (see getUserProvisionalRatingSummaries).
  const watchingTvTitleIds = libraryRows
    .filter((row) => (row.status === "watching" || row.status === "on_hold") && row.mediaType === "tv")
    .map((row) => row.titleId);
  const provisionalRatings = await getUserProvisionalRatingSummaries(targetUser.id, watchingTvTitleIds);

  const rows: GradeRow[] = libraryRows
    .map((row) => ({ ...row, provisional: provisionalRatings.get(row.titleId) ?? null }))
    .filter((row) => {
      if (!minRating) return true;
      const effectiveRating = getEffectiveRating(row.status, row.personalRating, row.provisional);
      return effectiveRating !== null && effectiveRating >= minRating;
    });

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
        <div className="space-y-6">
          <div className="flex gap-4 border-b">
            {MEDIA_TABS.map((tab) => (
              <Link
                key={tab.value}
                href={profileHref(username, tab.value, statusFilter, minRating)}
                className={cn(
                  "border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
                  mediaType === tab.value
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => {
              const isActive = statusFilter === filter.value;
              return (
                <Link
                  key={filter.label}
                  href={profileHref(username, mediaType, filter.value, minRating)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    isActive
                      ? "border-foreground bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {filter.label}
                </Link>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            {RATING_FILTERS.map((filter) => {
              const isActive = minRating === filter.value;
              return (
                <Link
                  key={filter.label}
                  href={profileHref(username, mediaType, statusFilter, filter.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    isActive
                      ? "border-foreground bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {filter.label}
                </Link>
              );
            })}
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {statusFilter || minRating
                ? "Nada bate com esse filtro."
                : mediaType === "movie"
                  ? "Nenhum filme por aqui ainda."
                  : "Nenhuma série por aqui ainda."}
            </p>
          ) : (
            <GradeSections rows={rows} today={todayBrDateString()} />
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Este perfil é fechado. Siga @{targetUser.username} e aguarde aceite para ver a grade completa.
        </p>
      )}
    </div>
  );
}
