"use client";

import { useEffect, useState } from "react";

import { DiscoverySection, type DiscoveryData } from "@/components/discovery/discovery-section";
import { DiscoverResultsTab } from "@/components/search/discover-results-tab";
import { SearchResultsTab } from "@/components/search/search-results-tab";
import { UserSearchTab } from "@/components/search/user-search-tab";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchCounts, type SearchCounts } from "@/hooks/use-search-counts";
import { FRANCHISE_FACETS, GENRE_FACETS } from "@/lib/tmdb";

const TABS = [
  { value: "all", label: "Tudo", kind: "tmdb" },
  { value: "tv", label: "Séries", kind: "tmdb" },
  { value: "movie", label: "Filmes", kind: "tmdb" },
  { value: "person", label: "Atores", kind: "tmdb" },
  { value: "user", label: "Usuários", kind: "user" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

type Scope = "nome" | "genero" | "franquia";

const SCOPE_LABELS: Record<Scope, string> = { nome: "Nome", genero: "Gênero", franquia: "Franquia" };

type DiscoverTabValue = "all" | "movie" | "tv";

const DISCOVER_TABS: { value: DiscoverTabValue; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "movie", label: "Filmes" },
  { value: "tv", label: "Séries" },
];

function tabLabel(tab: (typeof TABS)[number], counts: SearchCounts | null) {
  if (tab.value === "all") return tab.label;
  const count = counts?.[tab.value] ?? null;
  return count === null ? tab.label : `${tab.label} (${count})`;
}

export function SearchBox({ discovery }: { discovery: DiscoveryData }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>("all");

  const [scope, setScope] = useState<Scope>("nome");
  const [genreIdx, setGenreIdx] = useState(0);
  const [franchiseIdx, setFranchiseIdx] = useState(0);
  const [activeDiscoverTab, setActiveDiscoverTab] = useState<DiscoverTabValue>("all");

  const trimmed = query.trim();
  const counts = useSearchCounts(debouncedQuery);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(trimmed), 300);
    return () => clearTimeout(timeout);
  }, [trimmed]);

  const genre = GENRE_FACETS[genreIdx];
  const franchise = FRANCHISE_FACETS[franchiseIdx];
  const hasTvForGenre = scope !== "genero" || genre.tvGenreId != null;
  const facet = scope === "genero" ? "genre" : "franchise";
  const facetIdx = scope === "genero" ? genreIdx : franchiseIdx;
  // Remounts the discover tabs (and their independent usePaginatedSearch
  // state) whenever the selected genre/franchise changes — the hook only
  // resets its cache when the *query* prop changes, not the endpoint.
  const facetKey = `${facet}-${facetIdx}`;

  const placeholder =
    scope === "genero"
      ? `Filtrar em "${genre.label}" (opcional)...`
      : scope === "franquia"
        ? `Filtrar em "${franchise.label}" (opcional)...`
        : "Buscar filmes, séries, atores ou usuários...";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={scope} onValueChange={(value) => setScope(value as Scope)}>
          <SelectTrigger className="w-28">
            <SelectValue>{(value: Scope) => SCOPE_LABELS[value]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nome">Nome</SelectItem>
            <SelectItem value="genero">Gênero</SelectItem>
            <SelectItem value="franquia">Franquia</SelectItem>
          </SelectContent>
        </Select>

        {scope === "genero" && (
          <Select value={String(genreIdx)} onValueChange={(value) => setGenreIdx(Number(value))}>
            <SelectTrigger className="w-44">
              <SelectValue>{(value: string) => GENRE_FACETS[Number(value)]?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GENRE_FACETS.map((g, i) => (
                <SelectItem key={g.label} value={String(i)}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {scope === "franquia" && (
          <Select value={String(franchiseIdx)} onValueChange={(value) => setFranchiseIdx(Number(value))}>
            <SelectTrigger className="w-44">
              <SelectValue>{(value: string) => FRANCHISE_FACETS[Number(value)]?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {FRANCHISE_FACETS.map((f, i) => (
                <SelectItem key={f.label} value={String(i)}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className="flex-1"
        />
      </div>

      {scope !== "nome" ? (
        hasTvForGenre ? (
          <Tabs
            key={facetKey}
            value={activeDiscoverTab}
            onValueChange={(value) => setActiveDiscoverTab(value as DiscoverTabValue)}
          >
            <TabsList>
              {DISCOVER_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {DISCOVER_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} keepMounted className="pt-3">
                <DiscoverResultsTab
                  facet={facet}
                  idx={facetIdx}
                  type={tab.value}
                  query={debouncedQuery}
                  active={activeDiscoverTab === tab.value}
                />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <DiscoverResultsTab key={facetKey} facet="genre" idx={genreIdx} type="movie" query={debouncedQuery} active />
        )
      ) : debouncedQuery.length >= 2 ? (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tabLabel(tab, counts)}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} keepMounted className="pt-3">
              {tab.kind === "user" ? (
                <UserSearchTab query={debouncedQuery} active={activeTab === tab.value} />
              ) : (
                <SearchResultsTab type={tab.value} query={debouncedQuery} active={activeTab === tab.value} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <DiscoverySection {...discovery} />
      )}
    </div>
  );
}
