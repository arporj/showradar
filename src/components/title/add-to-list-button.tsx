"use client";

import { Heart, ListPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { addTitleToList, createList, removeTitleFromList, toggleFavorite } from "@/lib/actions/lists";
import type { getUserListsWithMembership } from "@/lib/lists";
import type { TmdbMediaType } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

type ListOption = Awaited<ReturnType<typeof getUserListsWithMembership>>[number];

export function AddToListButton({
  titleId,
  mediaType,
  tmdbId,
  initialLists,
}: {
  titleId: string;
  mediaType: TmdbMediaType;
  tmdbId: number;
  initialLists: ListOption[];
}) {
  const [lists, setLists] = useState(initialLists);
  const [isPending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  const favorites = lists.find((list) => list.isFavorites);
  const customLists = lists.filter((list) => !list.isFavorites);

  function handleFavoriteToggle() {
    setLists((prev) => prev.map((list) => (list.isFavorites ? { ...list, hasTitle: !list.hasTitle } : list)));
    startTransition(async () => {
      await toggleFavorite(titleId, mediaType, tmdbId);
    });
  }

  function handleToggleList(list: ListOption) {
    setLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, hasTitle: !l.hasTitle } : l)));
    startTransition(async () => {
      if (list.hasTitle) {
        await removeTitleFromList(list.id, titleId, mediaType, tmdbId);
      } else {
        await addTitleToList(list.id, titleId, mediaType, tmdbId);
      }
    });
  }

  function handleCreateList() {
    const trimmed = newListTitle.trim();
    if (!trimmed) return;
    setNewListTitle("");
    setCreating(false);
    startTransition(async () => {
      const created = await createList(trimmed, "");
      if (!created) return;
      setLists((prev) => [...prev, { id: created.id, title: trimmed, isFavorites: false, hasTitle: false }]);
      await addTitleToList(created.id, titleId, mediaType, tmdbId);
      setLists((prev) => prev.map((l) => (l.id === created.id ? { ...l, hasTitle: true } : l)));
      toast.success(`Lista "${trimmed}" criada e título adicionado`);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={isPending}
        onClick={handleFavoriteToggle}
        aria-label={favorites?.hasTitle ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        <Heart className={cn("size-4", favorites?.hasTitle && "fill-destructive text-destructive")} />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
          <ListPlus className="size-4" /> Listas
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Adicionar à lista</DropdownMenuLabel>
          </DropdownMenuGroup>
          {customLists.length === 0 && !creating && (
            <p className="px-1.5 py-1 text-xs text-muted-foreground">Você ainda não tem nenhuma lista.</p>
          )}
          {customLists.map((list) => (
            <DropdownMenuCheckboxItem
              key={list.id}
              checked={list.hasTitle}
              onCheckedChange={() => handleToggleList(list)}
            >
              {list.title}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          {creating ? (
            <div className="flex items-center gap-1 p-1">
              <input
                autoFocus
                value={newListTitle}
                onChange={(event) => setNewListTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreateList();
                  }
                }}
                placeholder="Nome da lista"
                className="h-7 flex-1 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button type="button" size="sm" className="h-7" onClick={handleCreateList}>
                Criar
              </Button>
            </div>
          ) : (
            <DropdownMenuItem closeOnClick={false} onClick={() => setCreating(true)}>
              <ListPlus /> Nova lista
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
