"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createList } from "@/lib/actions/lists";

export function CreateListForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const created = await createList(trimmed, description);
      if (created) {
        setTitle("");
        setDescription("");
        toast.success(`Lista "${trimmed}" criada`);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border p-4">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nome da lista (ex.: Melhores sci-fi de todos os tempos)"
        maxLength={80}
        disabled={isPending}
      />
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrição (opcional)"
        maxLength={300}
        disabled={isPending}
      />
      <Button type="submit" disabled={isPending || !title.trim()}>
        {isPending ? "Criando..." : "Criar lista"}
      </Button>
    </form>
  );
}
