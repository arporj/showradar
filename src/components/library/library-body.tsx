"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { LibraryBodySkeleton } from "@/components/library/library-skeleton";
import { TitleCard } from "@/components/library/title-card";
import { Badge } from "@/components/ui/badge";
import { LIBRARY_STATUS_LABEL, type LibraryStatus } from "@/lib/library-status";
import { cn } from "@/lib/utils";

const MEDIA_TABS = [
  { value: "tv", label: "Séries" },
  { value: "movie", label: "Filmes" },
] as const;

type MediaTab = (typeof MEDIA_TABS)[number]["value"];

const STATUS_FILTERS: { value: LibraryStatus | undefined; label: string }[] = [
  { value: undefined, label: "Tudo" },
  { value: "plan_to_watch", label: LIBRARY_STATUS_LABEL.plan_to_watch },
  { value: "watching", label: LIBRARY_STATUS_LABEL.watching },
  { value: "completed", label: LIBRARY_STATUS_LABEL.completed },
  { value: "dropped", label: LIBRARY_STATUS_LABEL.dropped },
];

function libraryHref(mediaType: MediaTab, status?: LibraryStatus, q?: string) {
  const params = new URLSearchParams();
  if (mediaType === "movie") params.set("type", "movie");
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/library?${query}` : "/library";
}

interface LibraryRow {
  titleId: string;
  tmdbId: number;
  mediaType: MediaTab;
  name: string;
  posterPath: string | null;
  status: LibraryStatus;
}

export function LibraryBody({
  mediaType,
  statusFilter,
  search,
  rows,
  searchSlot,
}: {
  mediaType: MediaTab;
  statusFilter: LibraryStatus | undefined;
  search: string;
  rows: LibraryRow[];
  searchSlot: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // isPending flips synchronously in this same click, before the navigation
  // resolves — swapping to the skeleton immediately instead of leaving the
  // previous tab's content frozen on screen (React/Next keep old content
  // visible through a transition by default; see plan notes on loading.tsx).
  function navigate(href: string) {
    startTransition(() => router.push(href));
  }

  const tabs = (
    <div className="flex gap-4 border-b">
      {MEDIA_TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => navigate(libraryHref(tab.value, statusFilter, search))}
          className={cn(
            "border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
            mediaType === tab.value
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  if (isPending) {
    return (
      <div className="space-y-6">
        {tabs}
        {searchSlot}
        <LibraryBodySkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tabs}
      {searchSlot}

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter.value;
          return (
            <button
              key={filter.label}
              type="button"
              onClick={() => navigate(libraryHref(mediaType, filter.value, search))}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                isActive ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {filter.label}
            </button>
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
