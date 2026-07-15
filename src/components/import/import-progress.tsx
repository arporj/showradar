"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Progress } from "@/components/ui/progress";
import { processImportBatch } from "@/lib/actions/import";

export function ImportProgress({
  jobId,
  initialProcessed,
  initialTotal,
}: {
  jobId: string;
  initialProcessed: number;
  initialTotal: number;
}) {
  const router = useRouter();
  const [processed, setProcessed] = useState(initialProcessed);
  const [total, setTotal] = useState(initialTotal);
  const [, startTransition] = useTransition();
  // Guards against React 18 Strict Mode's double-invoked effect starting two
  // concurrent batch loops for the same mount.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    startTransition(async () => {
      // Strictly sequential await loop, never setInterval — guarantees at
      // most one processImportBatch call in flight for this job at a time.
      for (;;) {
        const result = await processImportBatch(jobId);
        if (cancelled) return;
        if ("error" in result) return;

        setProcessed(result.totals.processedItems);
        setTotal(result.totals.totalItems);

        if (result.done) {
          router.refresh();
          return;
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [jobId, router]);

  const pct = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  return (
    <div className="space-y-2">
      <Progress value={pct} />
      <p className="text-sm text-muted-foreground tabular-nums">
        {processed} de {total} títulos processados
      </p>
    </div>
  );
}
