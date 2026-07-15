"use client";

import { Download, MoreVertical } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const DISMISSED_KEY = "showradar:android-install-dismissed";
// Mounted inside the authenticated app layout, so this only fires once per
// tab per login session instead of on every page — sessionStorage (not
// localStorage) is exactly "once per tab session" without extra bookkeeping.
const SESSION_SHOWN_KEY = "showradar:android-install-shown-session";

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
  const [step, setStep] = useState<"offer" | "manual">("offer");
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (sessionStorage.getItem(SESSION_SHOWN_KEY)) return;

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
      setDeferredEvent(event as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      localStorage.setItem(DISMISSED_KEY, "1");
      close();
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  function close() {
    setDeferredEvent(null);
    setStep("offer");
    setDontShowAgain(false);
  }

  // "Agora não": if the user also asked not to be shown this again, they'd
  // otherwise lose any way to find the install option later — the automatic
  // browser prompt this component relies on won't reappear either — so this
  // shows the manual fallback instead of just closing.
  function dismiss() {
    if (dontShowAgain) {
      localStorage.setItem(DISMISSED_KEY, "1");
      setStep("manual");
      return;
    }
    close();
  }

  async function install() {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    await deferredEvent.userChoice;
    // A captured beforeinstallprompt event can only be used once, accepted or
    // not, so there's nothing left to offer afterwards either way.
    if (dontShowAgain) localStorage.setItem(DISMISSED_KEY, "1");
    close();
  }

  // AlertDialogCancel is a Close primitive, so clicking it also fires this
  // (via the dialog's own open-state change) alongside its onClick — routing
  // both through here, keyed off `step`, keeps Escape/backdrop-dismiss
  // consistent with the Cancel button instead of a second, divergent path.
  function handleOpenChange(next: boolean) {
    if (next) return;
    if (step === "manual") {
      close();
      return;
    }
    dismiss();
  }

  return (
    <AlertDialog open={!!deferredEvent} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        {step === "offer" ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Instale o ShowRadar</AlertDialogTitle>
              <AlertDialogDescription>
                Adicione o ShowRadar à tela inicial para abrir como um app, com acesso mais rápido e notificações de
                estreia.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex items-center gap-2">
              <Checkbox
                id="android-install-dont-show-again"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              />
              <Label htmlFor="android-install-dont-show-again" className="font-normal text-muted-foreground">
                Não mostrar de novo
              </Label>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Agora não</AlertDialogCancel>
              <AlertDialogAction onClick={install}>
                <Download className="size-4" />
                Instalar
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Como instalar mais tarde</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-left">
                <span className="flex items-center gap-2">
                  Toque em <MoreVertical className="size-4 shrink-0" />{" "}
                  <strong className="text-foreground">no menu do navegador</strong>,
                </span>
                <span>
                  depois em <strong className="text-foreground">&quot;Instalar app&quot;</strong> (ou &quot;Adicionar
                  à tela inicial&quot;).
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={close}>Entendi</AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
