import { SearchBox } from "@/components/search/search-box";
import { auth } from "@/lib/auth";
import { getMostPopularUsers, getMostWatchedThisWeek, getRecommendedForYou, getTopRatedThisWeek } from "@/lib/discovery";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { q } = await searchParams;

  const [recommended, mostWatched, topRated, popularUsers] = await Promise.all([
    getRecommendedForYou(session.user.id),
    getMostWatchedThisWeek(session.user.id),
    getTopRatedThisWeek(session.user.id),
    getMostPopularUsers(session.user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Buscar</h1>
        <p className="text-muted-foreground">
          Encontre filmes, séries ou atores para adicionar à sua grade.
        </p>
      </div>
      <SearchBox discovery={{ recommended, mostWatched, topRated, popularUsers }} initialQuery={q ?? ""} />
    </div>
  );
}
