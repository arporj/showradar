import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <Skeleton className="-mx-6 -mt-8 h-56 rounded-none sm:h-72" />

      <div className="flex flex-col gap-6 sm:flex-row">
        <Skeleton className="mx-auto h-72 w-48 shrink-0 rounded-lg sm:mx-0" />

        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>

          <Skeleton className="h-9 w-40" />

          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <div className="flex gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="size-20 shrink-0 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
