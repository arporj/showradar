import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Página não encontrada</h1>
      <p className="max-w-sm text-muted-foreground">O que você procura não existe ou foi removido.</p>
      <Link href="/dashboard" className={buttonVariants({ variant: "default" })}>
        Voltar para o início
      </Link>
    </div>
  );
}
