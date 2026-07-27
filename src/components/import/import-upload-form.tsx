"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { startImdbImport, startLetterboxdImport, startTvTimeImport } from "@/lib/actions/import";

const MAX_SIZE_BYTES = 15 * 1024 * 1024;

interface ImportUploadFormProps {
  source: "tv_time" | "imdb" | "letterboxd";
}

const SOURCE_CONFIG = {
  tv_time: {
    extension: ".zip",
    label: "Selecionar arquivo .zip",
    errorWrongExtension: "Envie o arquivo .zip da exportação do TV Time",
    action: startTvTimeImport,
  },
  imdb: {
    extension: ".csv",
    label: "Selecionar arquivo .csv",
    errorWrongExtension: "Envie o arquivo .csv de avaliações do IMDb",
    action: startImdbImport,
  },
  letterboxd: {
    extension: ".zip",
    label: "Selecionar arquivo .zip",
    errorWrongExtension: "Envie o arquivo .zip da exportação do Letterboxd",
    action: startLetterboxdImport,
  },
} as const;

export function ImportUploadForm({ source }: ImportUploadFormProps) {
  const config = SOURCE_CONFIG[source];
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(config.extension)) {
      setError(config.errorWrongExtension);
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
      const result = await config.action(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        router.push(`/import/${result.jobId}`);
      }
    });
  }

  return (
    <div className="space-y-2">
      <input ref={fileInputRef} type="file" accept={config.extension} onChange={handleFileChange} className="hidden" />
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => fileInputRef.current?.click()}>
        {isPending ? "Enviando..." : config.label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
