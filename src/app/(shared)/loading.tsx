import { SearchResultCardSkeleton } from "@/components/search/result-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Fallback de carregamento do grupo (app) inteiro: garante que QUALQUER
// clique de menu troque de página imediatamente (URL + item ativo) e mostre
// esqueletos enquanto o servidor renderiza. Páginas com loading.tsx próprio
// (library, title, person) continuam usando os seus, mais específicos.
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SearchResultCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
