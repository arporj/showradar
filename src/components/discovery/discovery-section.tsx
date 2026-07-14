import { PopularUserCard } from "@/components/discovery/popular-user-card";
import { RecommendedSection } from "@/components/discovery/recommended-section";
import { SearchResultCard } from "@/components/search/result-card";
import type { DiscoveryTitle, PopularUser } from "@/lib/discovery";
import type { TmdbSearchResult } from "@/lib/tmdb";

function toSearchResult(title: DiscoveryTitle): TmdbSearchResult {
  return {
    id: title.tmdbId,
    media_type: title.mediaType,
    title: title.mediaType === "movie" ? title.name : undefined,
    name: title.mediaType === "tv" ? title.name : undefined,
    overview: title.overview ?? undefined,
    poster_path: title.posterPath,
    release_date: title.releaseDate ?? undefined,
    first_air_date: title.firstAirDate ?? undefined,
    inLibrary: title.inLibrary,
  };
}

export interface DiscoveryData {
  recommended: TmdbSearchResult[];
  mostWatched: DiscoveryTitle[];
  topRated: DiscoveryTitle[];
  popularUsers: PopularUser[];
}

// "Atores aniversariantes de hoje" is still left out — it'd need a new
// people/birthday table that doesn't exist yet.
export function DiscoverySection({ recommended, mostWatched, topRated, popularUsers }: DiscoveryData) {
  if (recommended.length === 0 && mostWatched.length === 0 && topRated.length === 0 && popularUsers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8 pt-2">
      {recommended.length > 0 && <RecommendedSection initialRecommended={recommended} />}

      {mostWatched.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Mais assistidos da semana</h2>
          <div className="space-y-3">
            {mostWatched.map((title) => (
              <SearchResultCard key={title.id} result={toSearchResult(title)} />
            ))}
          </div>
        </section>
      )}

      {topRated.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Maiores notas da semana</h2>
          <div className="space-y-3">
            {topRated.map((title) => (
              <SearchResultCard key={title.id} result={toSearchResult(title)} />
            ))}
          </div>
        </section>
      )}

      {popularUsers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Mais populares</h2>
          <div className="space-y-3">
            {popularUsers.map((user) => (
              <PopularUserCard key={user.id} user={user} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
