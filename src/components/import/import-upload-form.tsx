"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { startTvTimeImport } from "@/lib/actions/import";

const MAX_SIZE_BYTES = 15 * 1024 * 1024;

export function ImportUploadForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("Envie o arquivo .zip da exportação do TV Time");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("O arquivo deve ter no máximo 15MB");
      return;
    }

    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      const result = await startTvTimeImport(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        router.push(`/import/${result.jobId}`);
      }
    });
  }

  return (
    <div className="space-y-2">
      <input ref={fileInputRef} type="file" accept=".zip" onChange={handleFileChange} className="hidden" />
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => fileInputRef.current?.click()}>
        {isPending ? "Enviando..." : "Selecionar arquivo .zip"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
