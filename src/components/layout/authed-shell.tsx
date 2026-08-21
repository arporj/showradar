import Link from "next/link";
import { and, count, eq } from "drizzle-orm";

import { BottomNav } from "@/components/layout/bottom-nav";
import { DesktopNav } from "@/components/layout/desktop-nav";
import { Logo } from "@/components/layout/logo";
import { TmdbAttribution } from "@/components/layout/tmdb-attribution";
import { UserMenu } from "@/components/layout/user-menu";
import { InstallBanner } from "@/components/pwa/install-banner";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { OfflineSyncManager } from "@/components/pwa/offline-sync-manager";
import { PushPromptDialog } from "@/components/pwa/push-prompt-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { follows } from "@/db/schema";
import { signOut } from "@/lib/auth";
import { db } from "@/lib/db";

// Chrome completo do app (nav, menu do usuário, PWA). Extraído do
// (app)/layout.tsx porque a página de título agora vive num grupo de rotas
// próprio, que escolhe entre este shell e o público conforme a sessão —
// duplicar o header nos dois layouts sairia caro de manter.
export async function AuthedShell({
  user,
  children,
}: {
  user: { id: string; name?: string | null; username?: string | null; avatarUrl?: string | null; role?: string | null };
  children: React.ReactNode;
}) {
  const name = user.name ?? user.username ?? "";

  const [{ value: pendingRequests }] = await db
    .select({ value: count() })
    .from(follows)
    .where(and(eq(follows.followingId, user.id), eq(follows.status, "pending")));

  return (
    // O padding inferior no mobile reserva o espaço da BottomNav fixa
    // (h-16 + barra de gestos do sistema).
    <div className="flex min-h-svh flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      {/* Fora do header sticky de propósito: a barra rola junto com o
          conteúdo, como um aviso do navegador, não como parte do app. */}
      <InstallBanner />
      <header className="sticky top-0 z-40 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5 md:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/dashboard" prefetch={false} aria-label="ShowRadar — Início">
              <Logo className="text-lg" />
            </Link>
            <DesktopNav />
          </div>

          <div className="flex items-center gap-2">
            <OfflineIndicator />
            <ThemeToggle />
            <UserMenu
              name={name}
              username={user.username ?? ""}
              avatarUrl={user.avatarUrl ?? null}
              isAdmin={user.role === "admin"}
              pendingRequests={pendingRequests}
              signOutAction={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>

      <footer className="border-t px-6 py-4">
        <div className="mx-auto max-w-5xl">
          <TmdbAttribution />
        </div>
      </footer>

      <BottomNav />
      <OfflineSyncManager userId={user.id} />
      <PushPromptDialog />
    </div>
  );
}
