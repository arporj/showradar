import { Skeleton } from "@/components/ui/skeleton";

// Tabs + status pills + poster grid — the part that changes when switching
// tabs/filters. Reused by LibraryBody (client-driven instant swap on click)
// so it looks identical to the full-page version below.
export function LibraryBodySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="aspect-2/3 w-full" />
        ))}
      </div>
    </div>
  );
}

// Full-page fallback for library/loading.tsx (hard navigation/reload) —
// title + search bar shape + the body skeleton above.
export function LibrarySkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-9 w-full" />
      <LibraryBodySkeleton />
    </div>
  );
}
