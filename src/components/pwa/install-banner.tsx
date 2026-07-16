"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// Fechar vale só pela sessão da aba: a flag é gravada apenas no fechamento
// explícito (nunca ao exibir), então recarregar a página antes de interagir
// não suprime a barra, e uma nova visita (nova aba) volta a mostrá-la.
const SESSION_DISMISSED_KEY = "showradar:install-banner-dismissed";

// Not yet part of lib.dom.d.ts.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// iOS Safari has no `beforeinstallprompt` event (Apple's PWA install is
// manual, via the Share sheet) — this is the only way to prompt those users
// at all. iPadOS 13+ reports as "MacIntel" with touch support instead of
// "iPad" in the user agent, so that's checked too.
function isIosSafariBrowserTab() {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIos && !isStandalone;
}

type Mode = { kind: "chromium"; event: BeforeInstallPromptEvent } | { kind: "ios" };

// Barra fina acima do header convidando a instalar o PWA. Em navegadores
// Chromium ela só aparece quando `beforeinstallprompt` dispara (o navegador
// não o emite se o app já está instalado ou se o prompt nativo foi recusado
// há pouco tempo — nesses casos não há como oferecer instalação, então nada é
// mostrado). No iOS aparece sempre que a aba não está em modo standalone, com
// instruções manuais, já que lá não existe prompt programático.
export function InstallBanner() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [iosStepsOpen, setIosStepsOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_DISMISSED_KEY)) return;

    if (isIosSafariBrowserTab()) {
      // Com um pequeno atraso para não deslocar o layout no primeiro paint.
      const timeout = setTimeout(() => setMode({ kind: "ios" }), 1500);
      return () => clearTimeout(timeout);
    }

    function onBeforeInstallPrompt(event: Event) {
      // O listener continua registrado depois de a barra ser fechada, então a
      // flag precisa ser reconferida se o navegador disparar o evento de novo.
      if (sessionStorage.getItem(SESSION_DISMISSED_KEY)) return;
      event.preventDefault();
      setMode({ kind: "chromium", event: event as BeforeInstallPromptEvent });
    }

    function onAppInstalled() {
      sessionStorage.setItem(SESSION_DISMISSED_KEY, "1");
      setMode(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  function dismiss() {
    sessionStorage.setItem(SESSION_DISMISSED_KEY, "1");
    setIosStepsOpen(false);
    setMode(null);
  }

  async function install() {
    if (mode?.kind !== "chromium") return;
    await mode.event.prompt();
    await mode.event.userChoice;
    // A captured beforeinstallprompt event can only be used once, accepted or
    // not, so there's nothing left to offer afterwards either way.
    dismiss();
  }

  if (!mode) return null;

  return (
    <>
      <div className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2 md:px-6">
          <Download className="size-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1 truncate text-sm">
            Instale o ShowRadar na tela inicial
            <span className="hidden sm:inline"> para abrir como um app.</span>
          </p>
          {mode.kind === "chromium" ? (
            <Button size="sm" variant="secondary" onClick={install}>
              Instalar
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setIosStepsOpen(true)}>
              Como instalar
            </Button>
          )}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fechar convite de instalação"
            className="rounded-md p-1 transition-colors hover:bg-primary-foreground/10"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {mode.kind === "ios" && (
        <AlertDialog open={iosStepsOpen} onOpenChange={(next) => !next && setIosStepsOpen(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Instale o ShowRadar</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-left">
                <span className="flex items-center gap-2">
                  Toque em <Share className="size-4 shrink-0" />{" "}
                  <strong className="text-foreground">Compartilhar</strong> na barra do Safari,
                </span>
                <span className="flex items-center gap-2">
                  depois em <SquarePlus className="size-4 shrink-0" />{" "}
                  <strong className="text-foreground">&quot;Adicionar à Tela de Início&quot;</strong>.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={dismiss}>Entendi</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
