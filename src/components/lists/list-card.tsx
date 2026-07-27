"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DeleteListButton } from "@/components/lists/delete-list-button";
import { ListEditForm } from "@/components/lists/list-edit-form";
import { ListVisibilitySelect } from "@/components/lists/list-visibility-select";
import { Button } from "@/components/ui/button";
import type { getUserListsWithCounts } from "@/lib/lists";

type ListWithCount = Awaited<ReturnType<typeof getUserListsWithCounts>>[number];

export function ListCard({ list, username }: { list: ListWithCount; username: string }) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      {editing ? (
        <ListEditForm
          listId={list.id}
          initialTitle={list.title}
          initialDescription={list.description}
          onDone={() => setEditing(false)}
        />
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/l/${username}/${list.slug}`} className="font-medium hover:underline">
              {list.title}
            </Link>
            {list.description && <p className="line-clamp-2 text-sm text-muted-foreground">{list.description}</p>}
            <p className="text-xs text-muted-foreground">
              {list.itemCount} {list.itemCount === 1 ? "título" : "títulos"}
            </p>
          </div>
          {!list.isFavorites && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditing(true)}
              aria-label="Editar lista"
            >
              <Pencil className="size-3.5" />
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <ListVisibilitySelect listId={list.id} initial={list.visibility} />
        {!list.isFavorites && <DeleteListButton listId={list.id} listTitle={list.title} />}
      </div>
    </div>
  );
}
