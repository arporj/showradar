import { RatingStars } from "@/components/title/rating-stars";
import type { EpisodeRatingSummary } from "@/lib/episode-ratings";

// A title's personal rating is only "final" once it's completed/dropped —
// while still watching, the series hasn't been rated as a whole yet, so the
// best signal is the average of episodes rated so far. Both are readOnly
// displays of someone else's opinion, never editable from here.
export function FriendTitleRating({
  finalRating,
  provisional,
}: {
  finalRating: number | null;
  provisional: EpisodeRatingSummary | null;
}) {
  if (finalRating != null) {
    return <RatingStars value={finalRating} readOnly size="sm" />;
  }

  if (provisional) {
    return (
      <div
        className="flex items-center gap-1.5 opacity-60"
        title={`Nota provisória com base em ${provisional.count} episódio${provisional.count === 1 ? "" : "s"} avaliado${provisional.count === 1 ? "" : "s"}`}
      >
        <RatingStars value={Math.round(provisional.average)} readOnly size="sm" />
        <span className="text-[10px] leading-none text-muted-foreground">provisório</span>
      </div>
    );
  }

  return null;
}
