"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DISMISSED_KEY = "showradar:android-install-dismissed";

// Not yet part of lib.dom.d.ts.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Chrome/Android (and other Chromium browsers) fire `beforeinstallprompt`
// instead of showing any UI of their own once the manifest+SW installability
// criteria and the browser's engagement heuristic are both satisfied — without
// this listener the only affordance is a small, easy-to-miss icon in the
// omnibox or an entry in the overflow menu. Capturing the event lets us show
// our own visible call-to-action and fire the native prompt on demand,
// mirroring what ios-install-prompt.tsx already does for Safari.
export function AndroidInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      localStorage.setItem(DISMISSED_KEY, "1");
      setDeferredEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDeferredEvent(null);
  }

  async function install() {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    await deferredEvent.userChoice;
    // A captured beforeinstallprompt event can only be used once, accepted or
    // not, so there's nothing left to offer afterwards either way.
    dismiss();
  }

  return (
    <AlertDialog open={!!deferredEvent} onOpenChange={(next) => !next && dismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Instale o ShowRadar</AlertDialogTitle>
          <AlertDialogDescription>
            Adicione o ShowRadar à tela inicial para abrir como um app, com acesso mais rápido e notificações de
            estreia.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={dismiss}>Agora não</AlertDialogCancel>
          <AlertDialogAction onClick={install}>
            <Download className="size-4" />
            Instalar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
