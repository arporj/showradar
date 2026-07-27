"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateList } from "@/lib/actions/lists";
import type { ListVisibility } from "@/lib/lists";

const VISIBILITY_LABEL: Record<ListVisibility, string> = {
  private: "Privada",
  unlisted: "Não listada",
  public: "Pública",
};

const VISIBILITY_HINT: Record<ListVisibility, string> = {
  private: "Só você vê essa lista.",
  unlisted: "Quem tiver o link vê, mas ela não aparece em lugar nenhum nem é indexada pelo Google.",
  public: "Qualquer pessoa pode ver, e ela aparece indexada no Google.",
};

export function ListVisibilitySelect({ listId, initial }: { listId: string; initial: ListVisibility }) {
  const [visibility, setVisibility] = useOptimistic(initial);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value) return;
    const next = value as ListVisibility;
    startTransition(async () => {
      setVisibility(next);
      await updateList(listId, { visibility: next });
      toast.success(`Visibilidade alterada para "${VISIBILITY_LABEL[next]}"`);
    });
  }

  return (
    <div className="space-y-1">
      <Select value={visibility} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(VISIBILITY_LABEL) as ListVisibility[]).map((key) => (
            <SelectItem key={key} value={key}>
              {VISIBILITY_LABEL[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="max-w-xs text-xs text-muted-foreground">{VISIBILITY_HINT[visibility]}</p>
    </div>
  );
}
