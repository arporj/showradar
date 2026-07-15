import { and, count, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BottomNav } from "@/components/layout/bottom-nav";
import { DesktopNav } from "@/components/layout/desktop-nav";
import { Logo } from "@/components/layout/logo";
import { TmdbAttribution } from "@/components/layout/tmdb-attribution";
import { UserMenu } from "@/components/layout/user-menu";
import { AndroidInstallPrompt } from "@/components/pwa/android-install-prompt";
import { IosInstallPrompt } from "@/components/pwa/ios-install-prompt";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { OfflineSyncManager } from "@/components/pwa/offline-sync-manager";
import { ThemeToggle } from "@/components/theme-toggle";
import { follows } from "@/db/schema";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    // Not a plain redirect("/login") — if the session is invalid (e.g. the
    // user no longer exists), the stale cookie needs to actually be cleared,
    // which a Server Component can't do itself. See /api/auth/invalidate.
    redirect("/api/auth/invalidate");
  }

  const name = session.user.name ?? session.user.username ?? "";

  const [{ value: pendingRequests }] = await db
    .select({ value: count() })
    .from(follows)
    .where(and(eq(follows.followingId, session.user.id), eq(follows.status, "pending")));

  return (
    // O padding inferior no mobile reserva o espaço da BottomNav fixa
    // (h-16 + barra de gestos do sistema).
    <div className="flex min-h-svh flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-40 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5 md:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/dashboard" aria-label="ShowRadar — Início">
              <Logo className="text-lg" />
            </Link>
            <DesktopNav />
          </div>

          <div className="flex items-center gap-2">
            <OfflineIndicator />
            <ThemeToggle />
            <UserMenu
              name={name}
              username={session.user.username ?? ""}
              avatarUrl={session.user.avatarUrl ?? null}
              isAdmin={session.user.role === "admin"}
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
      <OfflineSyncManager userId={session.user.id} />
      <IosInstallPrompt />
      <AndroidInstallPrompt />
    </div>
  );
}
