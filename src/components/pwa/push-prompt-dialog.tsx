"use client";

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
import { checkPushStatus, subscribeBrowserToPush } from "@/lib/push-client";

// Igual ao convite de instalação do PWA: fechar vale só pela sessão da aba
// (gravado apenas no fechamento, nunca ao exibir), então recarregar antes de
// interagir não some com o convite, e ele volta em toda visita nova até a
// pessoa ativar de vez ou negar a permissão no navegador.
const SESSION_DISMISSED_KEY = "showradar:push-prompt-dismissed";

export function PushPromptDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_DISMISSED_KEY)) return;

    // Pequeno atraso para não competir com o primeiro paint da página.
    const timeout = setTimeout(async () => {
      const status = await checkPushStatus();
      if (status === "unsubscribed") setOpen(true);
    }, 1500);

    return () => clearTimeout(timeout);
  }, []);

  function dismiss() {
    sessionStorage.setItem(SESSION_DISMISSED_KEY, "1");
    setOpen(false);
  }

  async function handleEnable() {
    setIsSubmitting(true);
    try {
      await subscribeBrowserToPush();
    } catch {
      // Concedida, negada ou falha (inclusive uma rejeição inesperada do
      // navegador): nos três casos não há mais nada a pedir agora, então o
      // convite fecha e não insiste de novo nesta sessão.
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
            disponível — direto no navegador, sem precisar checar o app.
          </AlertDialogDescription>
        </AlertDialogHeader>
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
