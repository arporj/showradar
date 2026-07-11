import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">ShowRadar</h1>
        <p className="max-w-md text-muted-foreground">
          Controle o que você já assistiu, o que está assistindo e o que está prestes a estrear —
          tudo num só lugar.
        </p>
      </div>
      <div className="flex gap-3">
        <Button nativeButton={false} render={<Link href="/signup">Criar conta</Link>} />
        <Button nativeButton={false} variant="outline" render={<Link href="/login">Entrar</Link>} />
      </div>
    </div>
  );
}
