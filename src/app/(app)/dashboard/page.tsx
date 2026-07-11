import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import type { ReactNode } from "react";

import { NextEpisodeCard } from "@/components/dashboard/next-episode-card";
import { TitleCard } from "@/components/library/title-card";
import { UpcomingRow } from "@/components/library/upcoming-row";
import { Button } from "@/components/ui/button";
import { titles as titlesTable, userLibrary } from "@/db/schema";
import { logoutEverywhereAction } from "@/lib/actions/auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getNextEpisodesToWatch } from "@/lib/next-episode";
import { getUpcomingItems } from "@/lib/upcoming";

const DASHBOARD_LIMIT = 6;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;
  const userId = session.user.id;
  const name = session.user.name ?? session.user.username ?? "";

  const [nextEpisodes, notStartedEpisodes, pendingMovies, upcomingItems] = await Promise.all([
    getNextEpisodesToWatch(userId, "watching", DASHBOARD_LIMIT),
    getNextEpisodesToWatch(userId, "plan_to_watch", DASHBOARD_LIMIT),
    // Movies only — TV shows not yet started get the episode-level "Não
    // iniciado" card above instead of a plain poster here.
    db
      .select({
        titleId: titlesTable.id,
        tmdbId: titlesTable.tmdbId,
        mediaType: titlesTable.mediaType,
        name: titlesTable.name,
        posterPath: titlesTable.posterPath,
      })
      .from(userLibrary)
      .innerJoin(titlesTable, eq(userLibrary.titleId, titlesTable.id))
      .where(
        and(
          eq(userLibrary.userId, userId),
          eq(userLibrary.status, "plan_to_watch"),
          eq(titlesTable.mediaType, "movie"),
        ),
      )
      .orderBy(desc(userLibrary.addedAt))
      .limit(DASHBOARD_LIMIT),
    getUpcomingItems(userId),
  ]);

  const hasNothing =
    nextEpisodes.length === 0 &&
    notStartedEpisodes.length === 0 &&
    pendingMovies.length === 0 &&
    upcomingItems.length === 0;

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {name}</h1>
        {hasNothing && (
          <>
            <p className="text-muted-foreground">
              Sua grade ainda está vazia. Busque um filme ou série para começar a acompanhar o que você já assistiu,
              está assistindo ou quer ver.
            </p>
            <Button nativeButton={false} render={<Link href="/search">Buscar títulos</Link>} />
          </>
        )}
      </div>

      {nextEpisodes.length > 0 && (
        <DashboardSection title="Continuar assistindo" moreHref="/library?status=watching">
          <div className="space-y-2">
            {nextEpisodes.map((item) => (
              <NextEpisodeCard key={item.episodeId} item={item} />
            ))}
          </div>
        </DashboardSection>
      )}

      {notStartedEpisodes.length > 0 && (
        <DashboardSection title="Não iniciado" moreHref="/library?status=plan_to_watch">
          <div className="space-y-2">
            {notStartedEpisodes.map((item) => (
              <NextEpisodeCard key={item.episodeId} item={item} />
            ))}
          </div>
        </DashboardSection>
      )}

      {upcomingItems.length > 0 && (
        <DashboardSection title="Em breve" moreHref="/upcoming">
          <div className="space-y-2">
            {upcomingItems.slice(0, DASHBOARD_LIMIT).map((item) => (
              <UpcomingRow key={item.key} item={item} />
            ))}
          </div>
        </DashboardSection>
      )}

      {pendingMovies.length > 0 && (
        <DashboardSection title="Quero assistir" moreHref="/library?status=plan_to_watch">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {pendingMovies.map((row) => (
              <TitleCard
                key={row.titleId}
                href={`/title/${row.mediaType}/${row.tmdbId}`}
                posterPath={row.posterPath}
                name={row.name}
              />
            ))}
          </div>
        </DashboardSection>
      )}

      <div className="space-y-2 border-t pt-6">
        <h2 className="text-sm font-medium text-muted-foreground">Segurança</h2>
        <form action={logoutEverywhereAction}>
          <Button type="submit" variant="outline" size="sm">
            Sair de todos os dispositivos
          </Button>
        </form>
      </div>
    </div>
  );
}

function DashboardSection({ title, moreHref, children }: { title: string; moreHref: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link href={moreHref} className="text-sm text-muted-foreground hover:text-foreground">
          Ver tudo
        </Link>
      </div>
      {children}
    </div>
  );
}
