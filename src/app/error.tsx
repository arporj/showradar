"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Algo deu errado</h1>
      <p className="max-w-sm text-muted-foreground">
        Não conseguimos carregar essa página agora. Tente de novo em instantes.
      </p>
      <Button type="button" onClick={() => unstable_retry()}>
        Tentar de novo
      </Button>
    </div>
  );
}
