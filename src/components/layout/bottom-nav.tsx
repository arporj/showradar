"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BOTTOM_TAB_COUNT, MAIN_LINKS, isActive } from "@/components/layout/nav-links";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const TAB_LINKS = MAIN_LINKS.slice(0, BOTTOM_TAB_COUNT);
const MORE_LINKS = MAIN_LINKS.slice(BOTTOM_TAB_COUNT);

function tabClass(active: boolean) {
  return cn(
    "flex flex-col items-center justify-center gap-1 outline-none transition-colors",
    active ? "text-primary" : "text-muted-foreground",
  );
}

// Barra de abas fixa no rodapé (mobile). O padding inferior via
// env(safe-area-inset-bottom) evita colisão com a barra de gestos do
// Android/iOS quando o app roda instalado (PWA/TWA).
export function BottomNav() {
  const pathname = usePathname();
  const moreActive = MORE_LINKS.some((link) => isActive(pathname, link.href));

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {TAB_LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={tabClass(active)}
            >
              <link.icon className="size-5" />
              <span className="text-[10px] leading-none font-medium">{link.label}</span>
            </Link>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger render={<button type="button" className={tabClass(moreActive)} />}>
            <Ellipsis className="size-5" />
            <span className="text-[10px] leading-none font-medium">Mais</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" sideOffset={8} className="min-w-44">
            {MORE_LINKS.map((link) => (
              <DropdownMenuItem key={link.href} render={<Link href={link.href} />}>
                <link.icon /> {link.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
