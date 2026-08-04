import { RatingStars } from "@/components/title/rating-stars";
import type { EpisodeRatingSummary } from "@/lib/episode-ratings";

// A title's personal rating is só "final" quando completed/dropped — enquanto
// assistindo, o título ainda não foi avaliado como um todo, então o melhor
// sinal é a média dos episódios já avaliados. Sempre somente leitura aqui
// (dono ou amigo); editar a nota final é feito na página de detalhe.
export function TitleRatingDisplay({
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
