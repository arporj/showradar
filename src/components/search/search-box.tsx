"use client";

import { useEffect, useState } from "react";

import { SearchResultsTab } from "@/components/search/search-results-tab";
import { UserSearchTab } from "@/components/search/user-search-tab";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "all", label: "Tudo", kind: "tmdb" },
  { value: "tv", label: "Séries", kind: "tmdb" },
  { value: "movie", label: "Filmes", kind: "tmdb" },
  { value: "person", label: "Atores", kind: "tmdb" },
  { value: "user", label: "Usuários", kind: "user" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>("all");

  const trimmed = query.trim();

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(trimmed), 300);
    return () => clearTimeout(timeout);
  }, [trimmed]);

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar filmes, séries, atores ou usuários..."
        autoFocus
      />

      {debouncedQuery.length >= 2 && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
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
      )}
    </div>
  );
}
