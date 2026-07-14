"use client";

import { useOptimistic, useTransition } from "react";

import { Switch } from "@/components/ui/switch";
import { setUserSuspended } from "@/lib/actions/admin";

export function SuspendToggle({ userId, initialSuspended }: { userId: string; initialSuspended: boolean }) {
  const [isSuspended, setIsSuspended] = useOptimistic(initialSuspended);
  const [isPending, startTransition] = useTransition();

  function toggle(value: boolean) {
    startTransition(async () => {
      setIsSuspended(value);
      await setUserSuspended(userId, value);
    });
  }

  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Conta suspensa</p>
        <p className="text-xs text-muted-foreground">
          {isSuspended ? "Este usuário não consegue fazer login." : "Login normal, sem restrições."}
        </p>
      </div>
      <Switch checked={isSuspended} disabled={isPending} onCheckedChange={toggle} />
    </label>
  );
}
