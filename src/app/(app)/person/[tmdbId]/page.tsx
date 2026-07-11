import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/ui/back-button";
import { getPersonDetail, tmdbImageUrl } from "@/lib/tmdb";

export default async function PersonPage({ params }: { params: Promise<{ tmdbId: string }> }) {
  const { tmdbId } = await params;
  const id = Number(tmdbId);
  if (!Number.isInteger(id)) notFound();

  const person = await getPersonDetail(id).catch(() => null);
  if (!person) notFound();

  const photo = tmdbImageUrl(person.profile_path, "w342");
  const credits = (person.combined_credits?.cast ?? [])
    .filter((credit) => credit.media_type === "movie" || credit.media_type === "tv")
    .sort((a, b) => {
      const dateA = a.release_date ?? a.first_air_date ?? "";
      const dateB = b.release_date ?? b.first_air_date ?? "";
      return dateB.localeCompare(dateA);
    });

  return (
    <div className="space-y-8">
      <BackButton />

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="relative mx-auto h-56 w-40 shrink-0 overflow-hidden rounded-lg bg-muted sm:mx-0">
          {photo && <Image src={photo} alt={person.name} fill sizes="160px" className="object-cover" />}
        </div>
        <div className="flex-1 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{person.name}</h1>
          <p className="text-sm text-muted-foreground">
            {person.known_for_department}
            {person.place_of_birth ? ` • ${person.place_of_birth}` : ""}
          </p>
          {person.biography && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{person.biography}</p>
          )}
        </div>
      </div>

      {credits.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Filmografia</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {credits.slice(0, 24).map((credit) => {
              const poster = tmdbImageUrl(credit.poster_path, "w185");
              const title = credit.title ?? credit.name ?? "";
              return (
                <Link
                  key={`${credit.media_type}-${credit.id}`}
                  href={`/title/${credit.media_type}/${credit.id}`}
                  className="space-y-1"
                >
                  <div className="relative aspect-2/3 overflow-hidden rounded-md bg-muted">
                    {poster && <Image src={poster} alt={title} fill sizes="150px" className="object-cover" />}
                  </div>
                  <p className="line-clamp-2 text-xs">{title}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
