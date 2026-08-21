"use client";

import { useOptimistic, useTransition } from "react";

import { Switch } from "@/components/ui/switch";
import { updateNotificationPreferences } from "@/lib/actions/notifications";

interface Prefs {
  emailEnabled: boolean;
  notifyNewEpisode: boolean;
  notifyNewSeason: boolean;
  notifyMentions: boolean;
  notifyReplies: boolean;
  notifyReactions: boolean;
  notifyFollowRequest: boolean;
  notifyFollowAccepted: boolean;
  notifyTitleShared: boolean;
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

      <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Fui mencionado</p>
          <p className="text-xs text-muted-foreground">Avisar quando alguém mencionar você (@você) num comentário.</p>
        </div>
        <Switch
          checked={prefs.notifyMentions}
          disabled={isPending}
          onCheckedChange={(checked) => toggle("notifyMentions", checked)}
        />
      </label>

      <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Responderam meu comentário</p>
          <p className="text-xs text-muted-foreground">Avisar quando alguém responder um comentário seu.</p>
        </div>
        <Switch
          checked={prefs.notifyReplies}
          disabled={isPending}
          onCheckedChange={(checked) => toggle("notifyReplies", checked)}
        />
      </label>

      <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Reagiram ao meu comentário</p>
          <p className="text-xs text-muted-foreground">Avisar quando alguém curtir ou dar deslike num comentário seu.</p>
        </div>
        <Switch
          checked={prefs.notifyReactions}
          disabled={isPending}
          onCheckedChange={(checked) => toggle("notifyReactions", checked)}
        />
      </label>

      <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Pedido para seguir</p>
          <p className="text-xs text-muted-foreground">Avisar quando alguém pedir para seguir você.</p>
        </div>
        <Switch
          checked={prefs.notifyFollowRequest}
          disabled={isPending}
          onCheckedChange={(checked) => toggle("notifyFollowRequest", checked)}
        />
      </label>

      <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Pedido para seguir aceito</p>
          <p className="text-xs text-muted-foreground">Avisar quando seu pedido para seguir alguém for aceito.</p>
        </div>
        <Switch
          checked={prefs.notifyFollowAccepted}
          disabled={isPending}
          onCheckedChange={(checked) => toggle("notifyFollowAccepted", checked)}
        />
      </label>

      <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Recomendação de amigo</p>
          <p className="text-xs text-muted-foreground">
            Avisar quando um amigo compartilhar um filme ou série com você.
          </p>
        </div>
        <Switch
          checked={prefs.notifyTitleShared}
          disabled={isPending}
          onCheckedChange={(checked) => toggle("notifyTitleShared", checked)}
        />
      </label>
    </div>
  );
}
