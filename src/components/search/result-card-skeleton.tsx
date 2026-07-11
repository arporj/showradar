import { Skeleton } from "@/components/ui/skeleton";

export function SearchResultCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-lg border p-3">
      <Skeleton className="h-28 w-20 shrink-0 rounded-md" />
      <div className="flex flex-1 flex-col gap-2 py-1">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="mt-auto h-7 w-20" />
      </div>
    </div>
  );
}
