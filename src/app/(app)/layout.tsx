import { Menu } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SignOutForm } from "@/components/layout/sign-out-form";
import { TmdbAttribution } from "@/components/layout/tmdb-attribution";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { OfflineSyncManager } from "@/components/pwa/offline-sync-manager";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth, signOut } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/dashboard", label: "Início" },
  { href: "/feed", label: "Atividade" },
  { href: "/search", label: "Buscar" },
  { href: "/library", label: "Minha Grade" },
  { href: "/upcoming", label: "Em breve" },
  { href: "/history", label: "Histórico" },
  { href: "/friends", label: "Amigos" },
  { href: "/follow-requests", label: "Solicitações" },
  { href: "/settings", label: "Configurações" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    // Not a plain redirect("/login") — if the session is invalid (e.g. the
    // user no longer exists), the stale cookie needs to actually be cleared,
    // which a Server Component can't do itself. See /api/auth/invalidate.
    redirect("/api/auth/invalidate");
  }

  const name = session.user.name ?? session.user.username ?? "";
  const navLinks =
    session.user.role === "admin" ? [...NAV_LINKS, { href: "/admin", label: "Admin" }] : NAV_LINKS;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
              ShowRadar
            </Link>
            <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu" />}
              >
                <Menu className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {navLinks.map((link) => (
                  <DropdownMenuItem key={link.href} render={<Link href={link.href} />}>
                    {link.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <OfflineIndicator />
            <ThemeToggle />
            <Avatar className="size-8">
              <AvatarImage src={session.user.avatarUrl ?? undefined} alt={name} />
              <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm text-muted-foreground sm:inline">@{session.user.username}</span>
            <SignOutForm
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
              label="Sair"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>

      <footer className="border-t px-6 py-4">
        <div className="mx-auto max-w-5xl">
          <TmdbAttribution />
        </div>
      </footer>

      <OfflineSyncManager userId={session.user.id} />
    </div>
  );
}
