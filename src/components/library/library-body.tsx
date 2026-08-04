"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { GradeSections, type GradeRow } from "@/components/library/grade-sections";
import { LibraryBodySkeleton } from "@/components/library/library-skeleton";
import { LIBRARY_STATUS_LABEL, type LibraryStatus } from "@/lib/library-status";
import { RATING_FILTERS } from "@/lib/rating-filter";
import { todayBrDateString } from "@/lib/release-dates";
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
  { value: "on_hold", label: LIBRARY_STATUS_LABEL.on_hold },
  { value: "completed", label: LIBRARY_STATUS_LABEL.completed },
  { value: "dropped", label: LIBRARY_STATUS_LABEL.dropped },
];

function libraryHref(mediaType: MediaTab, status?: LibraryStatus, q?: string, minRating?: number) {
  const params = new URLSearchParams();
  if (mediaType === "movie") params.set("type", "movie");
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  if (minRating) params.set("minRating", String(minRating));
  const query = params.toString();
  return query ? `/library?${query}` : "/library";
}

export function LibraryBody({
  mediaType,
  statusFilter,
  minRating,
  search,
  rows,
  searchSlot,
}: {
  mediaType: MediaTab;
  statusFilter: LibraryStatus | undefined;
  minRating: number | undefined;
  search: string;
  rows: GradeRow[];
  searchSlot: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const today = todayBrDateString();

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
          onClick={() => navigate(libraryHref(tab.value, statusFilter, search, minRating))}
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
              onClick={() => navigate(libraryHref(mediaType, filter.value, search, minRating))}
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

      <div className="flex flex-wrap gap-2">
        {RATING_FILTERS.map((filter) => {
          const isActive = minRating === filter.value;
          return (
            <button
              key={filter.label}
              type="button"
              onClick={() => navigate(libraryHref(mediaType, statusFilter, search, filter.value))}
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
        search || minRating ? (
          <p className="text-sm text-muted-foreground">
            Nada na sua grade de {mediaType === "movie" ? "filmes" : "séries"} bate com esse filtro.
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
        <GradeSections rows={rows} today={today} />
      )}
    </div>
  );
}
