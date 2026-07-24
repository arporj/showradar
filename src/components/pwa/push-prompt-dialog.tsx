"use client";

import { useEffect, useId, useState } from "react";

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
import { checkPushStatus, subscribeBrowserToPush } from "@/lib/push-client";

// Fechar sem marcar o checkbox vale só pela sessão da aba (igual ao convite
// de instalação do PWA) — reaparece em toda visita nova até a pessoa ativar,
// negar a permissão no navegador, ou marcar "não mostrar novamente" (aí vira
// permanente, em localStorage, mesmo sem ela ter ativado nada).
const SESSION_DISMISSED_KEY = "showradar:push-prompt-dismissed";
const PERMANENT_DISMISSED_KEY = "showradar:push-prompt-dismissed-forever";

export function PushPromptDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const checkboxId = useId();

  useEffect(() => {
    if (localStorage.getItem(PERMANENT_DISMISSED_KEY) || sessionStorage.getItem(SESSION_DISMISSED_KEY)) return;

    // Pequeno atraso para não competir com o primeiro paint da página.
    const timeout = setTimeout(async () => {
      const status = await checkPushStatus();
      if (status === "unsubscribed") setOpen(true);
    }, 1500);

    return () => clearTimeout(timeout);
  }, []);

  function dismiss() {
    if (dontShowAgain) {
      localStorage.setItem(PERMANENT_DISMISSED_KEY, "1");
    } else {
      sessionStorage.setItem(SESSION_DISMISSED_KEY, "1");
    }
    setOpen(false);
  }

  async function handleEnable() {
    setIsSubmitting(true);
    try {
      await subscribeBrowserToPush();
    } catch {
      // Concedida, negada ou falha (inclusive uma rejeição inesperada do
      // navegador): nos três casos não há mais nada a pedir agora, então o
      // convite fecha (respeitando o checkbox como qualquer outro fechamento).
    } finally {
      setIsSubmitting(false);
      dismiss();
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ative as notificações</AlertDialogTitle>
          <AlertDialogDescription>
            Receba um aviso assim que um episódio novo ou lançamento de um título que você acompanha ficar
            disponível — direto no navegador, sem precisar checar o app. Você pode ativar isso a qualquer momento
            clicando na sua foto, no canto superior, e indo em &quot;Configurações&quot;.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label htmlFor={checkboxId} className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            id={checkboxId}
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked === true)}
          />
          Não mostrar novamente
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={dismiss} disabled={isSubmitting}>
            Agora não
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleEnable} disabled={isSubmitting}>
            Ativar notificações
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
