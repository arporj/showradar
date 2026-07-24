"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { unsubscribeFromPush } from "@/lib/actions/notifications";
import { checkPushStatus, subscribeBrowserToPush, type PushStatus } from "@/lib/push-client";

type Status = "checking" | PushStatus;

export function PushToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    checkPushStatus().then(setStatus);
  }, []);

  function handleEnable() {
    startTransition(async () => {
      const outcome = await subscribeBrowserToPush();
      setStatus(outcome === "subscribed" ? "subscribed" : outcome === "denied" ? "denied" : "unsubscribed");
    });
  }

  function handleDisable() {
    startTransition(async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Notificações push</p>
        <p className="text-xs text-muted-foreground">
          {status === "unsupported" && "Seu navegador não tem suporte a notificações push."}
          {status === "denied" && "Permissão de notificação bloqueada — libere nas configurações do navegador."}
          {(status === "checking" || status === "subscribed" || status === "unsubscribed") &&
            "Avisos de novos episódios e lançamentos direto no navegador."}
        </p>
      </div>
      {(status === "subscribed" || status === "unsubscribed") && (
        <Button
          type="button"
          variant={status === "subscribed" ? "outline" : "default"}
          disabled={isPending}
          onClick={status === "subscribed" ? handleDisable : handleEnable}
        >
          {status === "subscribed" ? "Desativar" : "Ativar"}
        </Button>
      )}
    </div>
  );
}
