"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateList } from "@/lib/actions/lists";

export function ListEditForm({
  listId,
  initialTitle,
  initialDescription,
  onDone,
}: {
  listId: string;
  initialTitle: string;
  initialDescription: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await updateList(listId, { title: trimmed, description });
      toast.success("Lista atualizada");
      router.refresh();
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} disabled={isPending} />
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrição (opcional)"
        maxLength={300}
        disabled={isPending}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending || !title.trim()}>
          Salvar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
