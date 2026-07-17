import { CommentsPreview } from "@/components/title/comments-preview";
import { RatingForm } from "@/components/title/rating-form";
import { RatingStars } from "@/components/title/rating-stars";
import type { Comment } from "@/lib/comments";
import type { RatingSummary } from "@/lib/ratings";

export function TitleRatingsSection({
  voteAverage,
  summary,
  currentUserRating,
  canRate,
  onRatingChange,
  onRatingDelete,
  commentPreview,
  commentCount,
  commentsBlurred,
  commentsHref,
}: {
  voteAverage: string | null;
  summary: RatingSummary | null;
  currentUserRating: number | null;
  canRate: boolean;
  onRatingChange: (rating: number) => Promise<void>;
  onRatingDelete: () => Promise<void>;
  commentPreview: Comment[];
  commentCount: number;
  commentsBlurred: boolean;
  commentsHref: string;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Avaliações</h2>

      <div className="flex flex-wrap items-end gap-6">
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

        {canRate ? (
          <RatingForm initialRating={currentUserRating} onChange={onRatingChange} onDelete={onRatingDelete} />
        ) : (
          <p className="text-xs text-muted-foreground">Marque como assistido para avaliar.</p>
        )}
      </div>

      <CommentsPreview comments={commentPreview} count={commentCount} blurred={commentsBlurred} href={commentsHref} />
    </div>
  );
}
