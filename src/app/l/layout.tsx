import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { TmdbAttribution } from "@/components/layout/tmdb-attribution";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";

// Chrome mínimo pra rota pública (fora do (app), que exige sessão em
// AppLayout) — visitante anônimo e crawler de SEO/link-preview precisam
// conseguir renderizar isso sem redirect pro login.
export default async function PublicListLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/" aria-label="ShowRadar — página inicial">
            <Logo className="text-lg" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session?.user ? (
              <Link href="/dashboard" className={buttonVariants({ variant: "default", size: "sm" })}>
                Abrir o ShowRadar
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Entrar
                </Link>
                <Link href="/signup" className={buttonVariants({ variant: "default", size: "sm" })}>
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">{children}</main>

      <footer className="border-t px-6 py-4">
        <div className="mx-auto max-w-5xl">
          <TmdbAttribution />
        </div>
      </footer>
    </div>
  );
}
