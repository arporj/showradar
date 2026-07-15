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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const DISMISSED_KEY = "showradar:ios-install-dismissed";
// Mounted inside the authenticated app layout, so this only fires once per
// tab per login session instead of on every page — sessionStorage (not
// localStorage) is exactly "once per tab session" without extra bookkeeping.
const SESSION_SHOWN_KEY = "showradar:ios-install-shown-session";

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
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (sessionStorage.getItem(SESSION_SHOWN_KEY)) return;
    if (!isIosSafariBrowserTab()) return;

    sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
    const timeout = setTimeout(() => setOpen(true), 2000);
    return () => clearTimeout(timeout);
  }, []);

  function dismiss() {
    if (dontShowAgain) localStorage.setItem(DISMISSED_KEY, "1");
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
        <div className="flex items-center gap-2">
          <Checkbox
            id="ios-install-dont-show-again"
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked === true)}
          />
          <Label htmlFor="ios-install-dont-show-again" className="font-normal text-muted-foreground">
            Não mostrar de novo
          </Label>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={dismiss}>Entendi</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
