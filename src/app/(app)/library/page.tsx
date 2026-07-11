import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";

import { TitleCard } from "@/components/library/title-card";
import { Badge } from "@/components/ui/badge";
import { titles as titlesTable, userLibrary } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isLibraryStatus, LIBRARY_STATUS_LABEL, type LibraryStatus } from "@/lib/library-status";

const STATUS_FILTERS: { value: LibraryStatus | undefined; label: string }[] = [
  { value: undefined, label: "Tudo" },
  { value: "plan_to_watch", label: LIBRARY_STATUS_LABEL.plan_to_watch },
  { value: "watching", label: LIBRARY_STATUS_LABEL.watching },
  { value: "completed", label: LIBRARY_STATUS_LABEL.completed },
  { value: "dropped", label: LIBRARY_STATUS_LABEL.dropped },
];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statusFilter = isLibraryStatus(status) ? status : undefined;

  const session = await auth();
  if (!session?.user) return null;

  const conditions = [eq(userLibrary.userId, session.user.id)];
  if (statusFilter) conditions.push(eq(userLibrary.status, statusFilter));

  const rows = await db
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
    .orderBy(desc(userLibrary.addedAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minha Grade</h1>
        <p className="text-muted-foreground">Tudo que você adicionou para assistir.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter.value;
          return (
            <Link
              key={filter.label}
              href={filter.value ? `/library?status=${filter.value}` : "/library"}
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
        <p className="text-sm text-muted-foreground">
          Nada por aqui ainda.{" "}
          <Link href="/search" className="underline underline-offset-4">
            Busque um título
          </Link>{" "}
          para adicionar.
        </p>
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
