"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MAIN_LINKS, isActive } from "@/components/layout/nav-links";
import { cn } from "@/lib/utils";

// Navegação principal no header (md+). Entre md e lg só cabem os ícones;
// os rótulos aparecem a partir de lg.
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal" className="hidden items-center gap-1 md:flex">
      {MAIN_LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            title={link.label}
            aria-current={active ? "page" : undefined}
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
