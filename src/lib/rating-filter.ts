import type { EpisodeRatingSummary } from "@/lib/episode-ratings";
import type { LibraryStatus } from "@/lib/library-status";

// Notas guardadas 1-10 (2 pontos por estrela, ver rating-stars.tsx) — os
// limiares abaixo são "N estrelas pra cima" na mesma escala.
export const RATING_FILTERS: { value: number | undefined; label: string }[] = [
  { value: undefined, label: "Todas as notas" },
  { value: 6, label: "3+ estrelas" },
  { value: 8, label: "4+ estrelas" },
  { value: 10, label: "5 estrelas" },
];

export function isRatingFilterValue(value: number | undefined): boolean {
  return value === undefined || RATING_FILTERS.some((filter) => filter.value === value);
}

// Mesma regra usada para exibir a nota (TitleRatingDisplay): final se
// completed/dropped, senão a média provisória dos episódios já avaliados
// enquanto assistindo/pausado. Usada aqui para poder filtrar por nota.
export function getEffectiveRating(
  status: LibraryStatus,
  personalRating: number | null,
  provisional: EpisodeRatingSummary | null,
): number | null {
  if (status === "completed" || status === "dropped") return personalRating;
  if (status === "watching" || status === "on_hold") return provisional ? Math.round(provisional.average) : null;
  return null;
}
