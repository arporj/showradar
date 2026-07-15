"use client";

import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

// Feedback imediato de navegação: o item de menu clicado fica ativo NA HORA
// (estado otimista), mesmo que o servidor demore a responder — sem isso, o
// Next só troca a URL/tela quando o payload da página chega, e o clique
// parece ter sido ignorado. Enquanto a transição está em voo, quem usa o
// hook também pode exibir a NavPendingBar.
export function useNavTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const [optimisticPath, setOptimisticPath] = useOptimistic(pathname);
  const [isPending, startTransition] = useTransition();

  function navigate(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    // Cliques modificados (nova aba, nova janela) mantêm o comportamento
    // nativo do navegador.
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    startTransition(() => {
      setOptimisticPath(href);
      router.push(href);
    });
  }

  return { optimisticPath, isPending, navigate };
}

// Barra fina pulsando no topo da tela enquanto a página destino carrega.
export function NavPendingBar({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      aria-hidden
      data-testid="nav-pending"
      className="fixed inset-x-0 top-0 z-[60] h-1 animate-pulse bg-primary"
    />
  );
}
