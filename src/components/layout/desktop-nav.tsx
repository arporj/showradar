"use client";

import Link from "next/link";

import { NavPendingBar, useNavTransition } from "@/components/layout/nav-transition";
import { MAIN_LINKS, isActive } from "@/components/layout/nav-links";
import { cn } from "@/lib/utils";

// Navegação principal no header (md+). Entre md e lg só cabem os ícones;
// os rótulos aparecem a partir de lg. O item ativo muda otimisticamente no
// clique (ver nav-transition.tsx).
export function DesktopNav() {
  const { optimisticPath, isPending, navigate } = useNavTransition();

  return (
    <nav aria-label="Navegação principal" className="hidden items-center gap-1 md:flex">
      <NavPendingBar show={isPending} />
      {MAIN_LINKS.map((link) => {
        const active = isActive(optimisticPath, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            prefetch={false}
            title={link.label}
            aria-current={active ? "page" : undefined}
            onClick={(event) => navigate(event, link.href)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <link.icon className="size-4 shrink-0" />
            <span className="hidden lg:inline">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
