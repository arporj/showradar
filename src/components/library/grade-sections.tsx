import { TitleCard } from "@/components/library/title-card";
import { TitleRatingDisplay } from "@/components/library/title-rating-display";
import type { EpisodeRatingSummary } from "@/lib/episode-ratings";
import { formatDate } from "@/lib/format-date";
import { LIBRARY_SECTION_LABEL, LIBRARY_STATUS_SECTION_ORDER, type LibraryStatus } from "@/lib/library-status";

export interface GradeRow {
  titleId: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  name: string;
  posterPath: string | null;
  status: LibraryStatus;
  personalRating: number | null;
  provisional: EpisodeRatingSummary | null;
  releaseDate?: string | null;
  watchProvidersBr?: unknown;
}

// Uma seção por status (só as que têm itens), na ordem definida em
// LIBRARY_STATUS_SECTION_ORDER — "Estou Assistindo" primeiro, depois "Quero
// Assistir", "Já Assisti", e o resto (pausado/abandonei) em seguida.
export function GradeSections({ rows, today }: { rows: GradeRow[]; today: string }) {
  const sections = LIBRARY_STATUS_SECTION_ORDER.map((status) => ({
    status,
    items: rows.filter((row) => row.status === status),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="space-y-8">
      {sections.map(({ status, items }) => (
        <section key={status} className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {LIBRARY_SECTION_LABEL[status]}{" "}
            <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((row) => {
              // Só filmes têm release_date único e cedo o bastante pra valer
              // a pena badge de estreia aqui — episódio futuro de série já
              // tem seção própria ("Em breve" no dashboard e /upcoming).
              const isUpcomingMovie = row.mediaType === "movie" && !!row.releaseDate && row.releaseDate > today;
              const finalRating = status === "completed" || status === "dropped" ? row.personalRating : null;
              const provisional = status === "watching" || status === "on_hold" ? row.provisional : null;

              return (
                <TitleCard
                  key={row.titleId}
                  href={`/title/${row.mediaType}/${row.tmdbId}`}
                  posterPath={row.posterPath}
                  name={row.name}
                  watchProvidersBr={row.watchProvidersBr}
                >
                  <div className="mt-1">
                    <TitleRatingDisplay finalRating={finalRating} provisional={provisional} />
                  </div>
                  {isUpcomingMovie && (
                    <p className="mt-1 text-xs text-muted-foreground">Estreia em {formatDate(row.releaseDate!)}</p>
                  )}
                </TitleCard>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
