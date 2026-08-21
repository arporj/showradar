"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Manda o visitante anônimo para o login guardando a página atual como
 * `callbackUrl`, para ele voltar exatamente para onde estava depois de
 * entrar ou criar a conta.
 *
 * Usado pelos controles da página de título, que é a única rota que abre sem
 * sessão (link compartilhado — ver proxy.ts). Ali os botões continuam
 * clicáveis de propósito: o clique é o momento em que a pessoa demonstra
 * interesse, então ele vira o convite para criar conta em vez de um botão
 * apagado que não explica nada.
 */
export function useSignInRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  return useCallback(() => {
    router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
  }, [pathname, router]);
}
