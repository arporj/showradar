"use client";

import { useOptimistic, useTransition } from "react";

import { Switch } from "@/components/ui/switch";
import { updateNotificationPreferences } from "@/lib/actions/notifications";

interface Prefs {
  emailEnabled: boolean;
  notifyNewEpisode: boolean;
  notifyNewSeason: boolean;
}

export function NotificationPreferencesForm({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useOptimistic(initial, (state: Prefs, partial: Partial<Prefs>) => ({
    ...state,
    ...partial,
  }));
  const [isPending, startTransition] = useTransition();

  function toggle(key: keyof Prefs, value: boolean) {
    startTransition(async () => {
      const next = { ...prefs, [key]: value };
      setPrefs(next);
      await updateNotificationPreferences(next);
    });
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Notificar por e-mail</p>
          <p className="text-xs text-muted-foreground">
            Além do push, também avisar por e-mail sobre novidades da sua grade.
          </p>
        </div>
        <Switch
          checked={prefs.emailEnabled}
          disabled={isPending}
          onCheckedChange={(checked) => toggle("emailEnabled", checked)}
        />
      </label>

      <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Novo episódio</p>
          <p className="text-xs text-muted-foreground">Avisar quando uma série da sua grade lançar um episódio novo.</p>
        </div>
        <Switch
          checked={prefs.notifyNewEpisode}
          disabled={isPending}
          onCheckedChange={(checked) => toggle("notifyNewEpisode", checked)}
        />
      </label>

      <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Nova temporada</p>
          <p className="text-xs text-muted-foreground">Avisar quando uma série da sua grade lançar uma temporada nova.</p>
        </div>
        <Switch
          checked={prefs.notifyNewSeason}
          disabled={isPending}
          onCheckedChange={(checked) => toggle("notifyNewSeason", checked)}
        />
      </label>
    </div>
  );
}
