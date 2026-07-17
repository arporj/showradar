import Image from "next/image";
import Link from "next/link";

import { AddToLibraryButton } from "@/components/search/add-to-library-button";
import { Badge } from "@/components/ui/badge";
import { TMDB_GENRE_NAMES, tmdbImageUrl, type TmdbSearchResult } from "@/lib/tmdb";

export function SearchResultCard({
  result,
  action,
  prefetch,
}: {
  result: TmdbSearchResult;
  // Slot renderizado ao lado do badge Filme/Série (ex.: lixeira de descartar
  // recomendação) — em linha, para nunca sobrepor o badge.
  action?: React.ReactNode;
  // Default (undefined) keeps Link's own default (hover/viewport prefetch) —
  // pass false for long lists (e.g. "Títulos parecidos") where prefetching
  // every card at once floods the connection pool.
  prefetch?: boolean;
}) {
  if (result.media_type === "person") {
    const photo = tmdbImageUrl(result.profile_path, "w185");
    return (
      <Link
        href={`/person/${result.id}`}
        prefetch={prefetch}
        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
      >
        <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-muted">
          {photo && <Image src={photo} alt={result.name ?? ""} fill sizes="56px" className="object-cover" />}
        </div>
        <div>
          <p className="font-medium">{result.name}</p>
          <p className="text-sm text-muted-foreground">{result.known_for_department ?? "Elenco"}</p>
        </div>
      </Link>
    );
  }

  const mediaType = result.media_type;
  const title = result.title ?? result.name ?? "";
  const year = (result.release_date ?? result.first_air_date ?? "").slice(0, 4);
  const poster = tmdbImageUrl(result.poster_path, "w185");

  const genres = (result.genre_ids ?? [])
    .map((id) => TMDB_GENRE_NAMES[id])
    .filter(Boolean)
    .slice(0, 3);
  const meta = [...genres];
  if (mediaType === "tv" && result.numberOfSeasons != null) {
    meta.push(`${result.numberOfSeasons} ${result.numberOfSeasons === 1 ? "temporada" : "temporadas"}`);
  }

  return (
    <div className="flex gap-3 rounded-lg border p-3">
      <Link
        href={`/title/${mediaType}/${result.id}`}
        prefetch={prefetch}
        className="relative h-28 w-20 shrink-0 overflow-hidden rounded-md bg-muted"
      >
        {poster ? (
          <Image src={poster} alt={title} fill sizes="80px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
            Sem capa
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/title/${mediaType}/${result.id}`} prefetch={prefetch} className="font-medium hover:underline">
            {title} {year && <span className="text-muted-foreground">({year})</span>}
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <Badge variant="secondary">{mediaType === "movie" ? "Filme" : "Série"}</Badge>
            {action}
          </div>
        </div>
        {meta.length > 0 && <p className="text-xs text-muted-foreground">{meta.join(" · ")}</p>}
        <p className="line-clamp-2 text-sm text-muted-foreground">{result.overview}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <AddToLibraryButton mediaType={mediaType} tmdbId={result.id} initiallyAdded={!!result.inLibrary} />
        </div>
      </div>
    </div>
  );
}
