import Link from "next/link";

import { RetrospectivaReveal } from "@/components/stats/retrospectiva-reveal";
import { auth } from "@/lib/auth";
import { getYearStats } from "@/lib/stats";

export default async function RetrospectivaPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getUTCFullYear();
  const requestedYear = Number(yearParam);
  const year = Number.isFinite(requestedYear) && requestedYear > 0 ? requestedYear : currentYear;

  const stats = await getYearStats(session.user.id, year);
  const isEmpty =
    stats.episodesWatchedCount === 0 && stats.moviesWatchedCount === 0 && stats.seriesCompleted.length === 0;

  if (isEmpty) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">Ainda não há atividade suficiente em {year} pra montar uma retrospectiva.</p>
        <Link href="/stats" className="text-sm underline underline-offset-4">
          Voltar pras estatísticas
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Link href={`/stats?year=${year}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Voltar
        </Link>
      </div>
      <RetrospectivaReveal year={year} stats={stats} />
    </div>
  );
}
