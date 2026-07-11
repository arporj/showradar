"use client";

import { useOptimistic, useTransition } from "react";

import { Switch } from "@/components/ui/switch";
import { updateProfileVisibility } from "@/lib/actions/profile";

export function PrivacyToggle({ initial }: { initial: boolean }) {
  const [isPrivate, setIsPrivate] = useOptimistic(initial);
  const [isPending, startTransition] = useTransition();

  function toggle(value: boolean) {
    startTransition(async () => {
      setIsPrivate(value);
      await updateProfileVisibility(value);
    });
  }

  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Perfil fechado</p>
        <p className="text-xs text-muted-foreground">
          {isPrivate
            ? "Só quem você aceitar como seguidor vê sua grade completa."
            : "Qualquer pessoa pode ver sua grade completa, sem precisar seguir."}
        </p>
      </div>
      <Switch checked={isPrivate} disabled={isPending} onCheckedChange={toggle} />
    </label>
  );
}
