import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ImportProgress } from "@/components/import/import-progress";
import { UnmatchedList } from "@/components/import/unmatched-list";
import { importJobItems, importJobs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const STATUS_LABEL: Record<string, string> = {
  processing: "Processando",
  completed: "Importação concluída",
  completed_with_errors: "Concluída com pendências",
  failed: "Falhou",
};

export default async function ImportJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const [job] = await db
    .select()
    .from(importJobs)
    .where(and(eq(importJobs.id, jobId), eq(importJobs.userId, session.user.id)));
  if (!job) notFound();

  const isDone = job.status !== "processing";

  const unmatchedItems = isDone
    ? await db
        .select({ id: importJobItems.id, rawTitle: importJobItems.rawTitle })
        .from(importJobItems)
        .where(and(eq(importJobItems.jobId, job.id), eq(importJobItems.status, "unmatched")))
    : [];

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importação do TV Time</h1>
        <p className="text-muted-foreground">{STATUS_LABEL[job.status] ?? job.status}</p>
      </div>

      {job.status === "failed" ? (
        <p className="text-sm text-destructive">{job.errorMessage}</p>
      ) : !isDone ? (
        <ImportProgress jobId={job.id} initialProcessed={job.processedItems} initialTotal={job.totalItems} />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border p-3">
              <p className="text-2xl font-semibold tabular-nums">{job.matchedItems}</p>
              <p className="text-xs text-muted-foreground">Importados</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-2xl font-semibold tabular-nums">{job.unmatchedItems}</p>
              <p className="text-xs text-muted-foreground">Não encontrados</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-2xl font-semibold tabular-nums">{job.errorItems}</p>
              <p className="text-xs text-muted-foreground">Com erro</p>
            </div>
          </div>
          <UnmatchedList items={unmatchedItems} />
        </div>
      )}

      <Link href="/settings/import" className="block text-sm underline underline-offset-4">
        Voltar
      </Link>
    </div>
  );
}
