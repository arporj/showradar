"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { setOfflineUserId } from "@/lib/offline/current-user";
import { drainQueue } from "@/lib/offline/queue";

// Singleton, renders nothing — same pattern as RegisterServiceWorker.
// Mounted once in (app)/layout.tsx.
export function OfflineSyncManager({ userId }: { userId: string }) {
  // Set synchronously during render, not inside a useEffect: this needs to
  // be known before a page below this layout can possibly hydrate and
  // accept a click, since hydration proceeds top-down (layout before page).
  setOfflineUserId(userId);

  const router = useRouter();

  useEffect(() => {
    async function replay() {
      const synced = await drainQueue();
      if (synced > 0) {
        router.refresh(); // reflect whatever the server actually applied (last-write-wins)
        toast.success(synced === 1 ? "1 ação sincronizada" : `${synced} ações sincronizadas`);
      }
    }

    // Leftover queue from a previous offline session, already online on mount.
    if (navigator.onLine) void replay();

    window.addEventListener("online", replay);

    function onMessage(event: MessageEvent) {
      if (event.data?.type === "showradar:replay-queue") void replay();
    }
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("online", replay);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [router]);

  return null;
}
