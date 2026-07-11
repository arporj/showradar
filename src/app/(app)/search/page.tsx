import { SearchBox } from "@/components/search/search-box";

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Buscar</h1>
        <p className="text-muted-foreground">
          Encontre filmes, séries ou atores para adicionar à sua grade.
        </p>
      </div>
      <SearchBox />
    </div>
  );
}
