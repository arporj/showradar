import { asc, eq } from "drizzle-orm";

import { ajustesDataLancamento, titles, users } from "@/db/schema";
import { db } from "@/lib/db";

export interface AjusteDataLancamento {
  titleId: string;
  tmdbId: number;
  nome: string;
  dias: number;
  motivo: string;
  atualizadoEm: Date;
  atualizadoPor: string | null;
}

/** Ajustes manuais de data de lançamento, em ordem alfabética da série. */
export async function listarAjustesDataLancamento(): Promise<AjusteDataLancamento[]> {
  return db
    .select({
      titleId: ajustesDataLancamento.titleId,
      tmdbId: titles.tmdbId,
      nome: titles.name,
      dias: ajustesDataLancamento.dias,
      motivo: ajustesDataLancamento.motivo,
      atualizadoEm: ajustesDataLancamento.atualizadoEm,
      atualizadoPor: users.name,
    })
    .from(ajustesDataLancamento)
    .innerJoin(titles, eq(titles.id, ajustesDataLancamento.titleId))
    .leftJoin(users, eq(users.id, ajustesDataLancamento.atualizadoPor))
    .orderBy(asc(titles.name));
}
