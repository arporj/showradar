import { desc, eq } from "drizzle-orm";
import Link from "next/link";

import { ImportUploadForm } from "@/components/import/import-upload-form";
import { importJobs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format-date";

const STATUS_LABEL: Record<string, string> = {
  processing: "Processando",
  completed: "Concluído",
  completed_with_errors: "Concluído com pendências",
  failed: "Falhou",
};

export default async function ImportSettingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const jobs = await db
    .select()
    .from(importJobs)
    .where(eq(importJobs.userId, session.user.id))
    .orderBy(desc(importJobs.createdAt));

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar histórico</h1>
        <p className="text-muted-foreground">Traga seu histórico de séries e filmes de outro app.</p>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div>
          <h2 className="text-sm font-medium">TV Time</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Baixe seu export em{" "}
            <a
              href="https://gdpr.tvtime.com/gdpr/self-service"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              gdpr.tvtime.com
            </a>{" "}
            e envie o arquivo .zip aqui. Só lemos as suas séries, filmes e episódios assistidos — comentários,
            reações e dados de conta do arquivo nunca são abertos.
          </p>
        </div>
        <ImportUploadForm />
      </div>

      {jobs.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Importações anteriores</h2>
          <div className="space-y-2">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/import/${job.id}`}
                className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
              >
                <span>{formatDate(job.createdAt)}</span>
                <span className="text-muted-foreground">
                  {STATUS_LABEL[job.status] ?? job.status} • {job.matchedItems}/{job.totalItems}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
