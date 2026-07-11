import Image from "next/image";
import Link from "next/link";

import { AddToLibraryButton } from "@/components/search/add-to-library-button";
import { Badge } from "@/components/ui/badge";
import { tmdbImageUrl, type TmdbSearchResult } from "@/lib/tmdb";

export function SearchResultCard({ result }: { result: TmdbSearchResult }) {
  if (result.media_type === "person") {
    const photo = tmdbImageUrl(result.profile_path, "w185");
    return (
      <Link
        href={`/person/${result.id}`}
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

  return (
    <div className="flex gap-3 rounded-lg border p-3">
      <Link
        href={`/title/${mediaType}/${result.id}`}
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
          <Link href={`/title/${mediaType}/${result.id}`} className="font-medium hover:underline">
            {title} {year && <span className="text-muted-foreground">({year})</span>}
          </Link>
          <Badge variant="secondary">{mediaType === "movie" ? "Filme" : "Série"}</Badge>
        </div>
        {mediaType === "tv" && result.numberOfSeasons != null && (
          <p className="text-xs text-muted-foreground">
            {result.numberOfSeasons} {result.numberOfSeasons === 1 ? "temporada" : "temporadas"}
          </p>
        )}
        <p className="line-clamp-2 text-sm text-muted-foreground">{result.overview}</p>
        <div className="mt-auto pt-1">
          <AddToLibraryButton mediaType={mediaType} tmdbId={result.id} initiallyAdded={!!result.inLibrary} />
        </div>
      </div>
    </div>
  );
}
