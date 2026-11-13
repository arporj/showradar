import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto das páginas da aba "Séries" do admin: cabeçalho, abas, menus e
// um bloco de conteúdo (tabela ou formulário + tabela).
export function AdminSeriesSkeleton({ comFormulario = false }: { comFormulario?: boolean }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-4 border-b pb-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-14" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-36 rounded-full" />
        <Skeleton className="h-9 w-40 rounded-full" />
      </div>
      {comFormulario && <Skeleton className="h-48 w-full rounded-lg" />}
      <div className="space-y-2 rounded-lg border p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    </div>
  );
}
