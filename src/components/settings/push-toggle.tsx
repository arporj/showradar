"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/actions/notifications";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

type Status = "checking" | "unsupported" | "subscribed" | "unsubscribed" | "denied";

export function PushToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function checkStatus() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        setStatus(existing ? "subscribed" : "unsubscribed");
      } catch {
        setStatus("unsupported");
      }
    }

    checkStatus();
  }, []);

  function handleEnable() {
    startTransition(async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

      await subscribeToPush(
        { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
        navigator.userAgent,
      );
      setStatus("subscribed");
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
