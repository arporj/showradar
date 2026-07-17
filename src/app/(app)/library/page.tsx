import { and, desc, eq, sql } from "drizzle-orm";

import { LibraryBody } from "@/components/library/library-body";
import { LibrarySearchInput } from "@/components/library/library-search-input";
import { titles as titlesTable, userLibrary } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isLibraryStatus } from "@/lib/library-status";
import { normalizeSearchText } from "@/lib/utils";

type MediaTab = "tv" | "movie";

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

      <LibraryBody
        mediaType={mediaType}
        statusFilter={statusFilter}
        search={search}
        rows={rows}
        searchSlot={<LibrarySearchInput />}
      />
    </div>
  );
}
