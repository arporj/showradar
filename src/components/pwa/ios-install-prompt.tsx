"use client";

import { Share, SquarePlus } from "lucide-react";
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

const DISMISSED_KEY = "showradar:ios-install-dismissed";

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

export function IosInstallPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (!isIosSafariBrowserTab()) return;

    const timeout = setTimeout(() => setOpen(true), 2000);
    return () => clearTimeout(timeout);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setOpen(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Instale o ShowRadar</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-left">
            <span className="flex items-center gap-2">
              Toque em <Share className="size-4 shrink-0" /> <strong className="text-foreground">Compartilhar</strong>
              na barra do Safari,
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
  );
}
