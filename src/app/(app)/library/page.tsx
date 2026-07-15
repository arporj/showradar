import { and, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";

import { LibrarySearchInput } from "@/components/library/library-search-input";
import { TitleCard } from "@/components/library/title-card";
import { Badge } from "@/components/ui/badge";
import { titles as titlesTable, userLibrary } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isLibraryStatus, LIBRARY_STATUS_LABEL, type LibraryStatus } from "@/lib/library-status";
import { normalizeSearchText } from "@/lib/utils";

const STATUS_FILTERS: { value: LibraryStatus | undefined; label: string }[] = [
  { value: undefined, label: "Tudo" },
  { value: "plan_to_watch", label: LIBRARY_STATUS_LABEL.plan_to_watch },
  { value: "watching", label: LIBRARY_STATUS_LABEL.watching },
  { value: "completed", label: LIBRARY_STATUS_LABEL.completed },
  { value: "dropped", label: LIBRARY_STATUS_LABEL.dropped },
];

const MEDIA_TABS = [
  { value: "tv", label: "Séries" },
  { value: "movie", label: "Filmes" },
] as const;

type MediaTab = (typeof MEDIA_TABS)[number]["value"];

function libraryHref(mediaType: MediaTab, status?: LibraryStatus, q?: string) {
  const params = new URLSearchParams();
  if (mediaType === "movie") params.set("type", "movie");
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/library?${query}` : "/library";
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; q?: string }>;
}) {
  const { status, type, q } = await searchParams;
  const statusFilter = isLibraryStatus(status) ? status : undefined;
  const mediaType: MediaTab = type === "movie" ? "movie" : "tv";
  const search = q?.trim() ?? "";

  const session = await auth();
  if (!session?.user) return null;

  const conditions = [
    eq(userLibrary.userId, session.user.id),
    eq(titlesTable.mediaType, mediaType),
  ];
  if (statusFilter) conditions.push(eq(userLibrary.status, statusFilter));

  // "Tudo" groups by status before recency — watching first (what's active
  // right now), then plan_to_watch (queued up next), then completed, and
  // dropped last (the least relevant group). A no-op once a status filter is
  // applied above, since every row then shares the same rank already.
  const statusRank = sql<number>`case ${userLibrary.status}
    when 'watching' then 0
    when 'plan_to_watch' then 1
    when 'completed' then 2
    when 'dropped' then 3
    else 4
  end`;

  const allRows = await db
    .select({
      titleId: titlesTable.id,
      tmdbId: titlesTable.tmdbId,
      mediaType: titlesTable.mediaType,
      name: titlesTable.name,
      posterPath: titlesTable.posterPath,
      status: userLibrary.status,
      addedAt: userLibrary.addedAt,
    })
    .from(userLibrary)
    .innerJoin(titlesTable, eq(userLibrary.titleId, titlesTable.id))
    .where(and(...conditions))
    .orderBy(statusRank, desc(userLibrary.addedAt));

  // Filtro de texto em JS (a página já carrega a grade inteira do usuário):
  // normalizado para ignorar acentos e caixa — "percy" acha "Percy", "duna"
  // acha "Duna", "ficcao" acha "Ficção".
  const rows = search
    ? allRows.filter((row) => normalizeSearchText(row.name).includes(normalizeSearchText(search)))
    : allRows;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minha Grade</h1>
        <p className="text-muted-foreground">Tudo que você adicionou para assistir.</p>
      </div>

      <div className="flex gap-4 border-b">
        {MEDIA_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={libraryHref(tab.value, statusFilter, search)}
            className={`border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
              mediaType === tab.value
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <LibrarySearchInput />

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter.value;
          return (
            <Link
              key={filter.label}
              href={libraryHref(mediaType, filter.value, search)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        search ? (
          <p className="text-sm text-muted-foreground">
            Nada na sua grade de {mediaType === "movie" ? "filmes" : "séries"} bate com &quot;{search}&quot;.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {mediaType === "movie" ? "Nenhum filme por aqui ainda." : "Nenhuma série por aqui ainda."}{" "}
            <Link href="/search" className="underline underline-offset-4">
              Busque um título
            </Link>{" "}
            para adicionar.
          </p>
        )
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {rows.map((row) => (
            <TitleCard
              key={row.titleId}
              href={`/title/${row.mediaType}/${row.tmdbId}`}
              posterPath={row.posterPath}
              name={row.name}
            >
              <Badge variant="secondary" className="mt-1">
                {LIBRARY_STATUS_LABEL[row.status]}
              </Badge>
            </TitleCard>
          ))}
        </div>
      )}
    </div>
  );
}
