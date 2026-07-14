import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RatingForm } from "@/components/title/rating-form";
import { RatingStars } from "@/components/title/rating-stars";
import type { RatingSummary, TitleReview } from "@/lib/ratings";
import { formatDate } from "@/lib/format-date";
import type { TmdbMediaType } from "@/lib/tmdb";

export function TitleRatingsSection({
  titleId,
  mediaType,
  tmdbId,
  voteAverage,
  summary,
  reviews,
  currentUserId,
  currentUserRating,
  currentUserReviewText,
  canRate,
}: {
  titleId: string;
  mediaType: TmdbMediaType;
  tmdbId: number;
  voteAverage: string | null;
  summary: RatingSummary | null;
  reviews: TitleReview[];
  currentUserId: string | undefined;
  currentUserRating: number | null;
  currentUserReviewText: string | null;
  canRate: boolean;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Avaliações</h2>

      <div className="flex flex-wrap items-center gap-6">
        {voteAverage != null && (
          <div>
            <p className="text-xs text-muted-foreground">TMDb</p>
            <p className="text-sm font-medium">{Number(voteAverage).toFixed(1)}/10</p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">ShowRadar</p>
          {summary ? (
            <div className="flex items-center gap-2">
              <RatingStars value={Math.round(summary.average)} readOnly size="sm" />
              <span className="text-sm text-muted-foreground">
                ({summary.count} {summary.count === 1 ? "avaliação" : "avaliações"})
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Ainda sem avaliações</p>
          )}
        </div>
      </div>

      {canRate && (
        <RatingForm
          titleId={titleId}
          mediaType={mediaType}
          tmdbId={tmdbId}
          initialRating={currentUserRating}
          initialReviewText={currentUserReviewText}
        />
      )}

      {reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => {
            const displayName = review.name ?? review.username ?? "";
            return (
              <div key={review.userId} className="flex gap-3 rounded-lg border p-3">
                <Link href={`/user/${review.username}`} className="shrink-0">
                  <Avatar className="size-9">
                    <AvatarImage src={review.avatarUrl ?? undefined} alt={displayName} />
                    <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/user/${review.username}`} className="text-sm font-medium hover:underline">
                      {displayName}
                    </Link>
                    {review.userId === currentUserId && (
                      <span className="text-xs text-muted-foreground">(você)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <RatingStars value={review.rating} readOnly size="sm" />
                    <span className="text-xs text-muted-foreground">{formatDate(review.reviewUpdatedAt)}</span>
                  </div>
                  {review.reviewText && (
                    <p className="text-sm leading-relaxed text-muted-foreground">{review.reviewText}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
