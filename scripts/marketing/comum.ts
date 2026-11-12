// Utilidades compartilhadas pelos scripts do pacote semanal de posts.
import { mkdirSync } from "node:fs";
import path from "node:path";

import { semanaSeguinte, type Intervalo } from "@/dominio/marketing/semana";
import { shiftDateString, todayBrDateString } from "@/lib/release-dates";

/** Pasta de saída, fora do Git: o repositório é público e as imagens são dos estúdios. */
export const PASTA_SEMANAS = path.resolve("marketing", "semanas");

/**
 * Semana alvo: a data de início passada como argumento (AAAA-MM-DD, uma
 * segunda-feira) ou, sem argumento, a próxima semana a partir de hoje em Brasília.
 */
export function semanaAlvo(argumento: string | undefined): Intervalo {
  if (argumento) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(argumento)) throw new Error(`Data inválida: ${argumento} (use AAAA-MM-DD)`);
    const intervalo = semanaSeguinte(shiftDateString(argumento, -1));
    if (intervalo.inicio !== argumento) throw new Error(`${argumento} não é segunda-feira`);
    return intervalo;
  }
  return semanaSeguinte(todayBrDateString());
}


export function pastaDaSemana(intervalo: Intervalo): string {
  const pasta = path.join(PASTA_SEMANAS, intervalo.inicio);
  mkdirSync(pasta, { recursive: true });
  return pasta;
}

/** Executa tarefas assíncronas com no máximo `limite` simultâneas (respeita o limite do TMDb). */
export async function emLotes<T, R>(itens: T[], limite: number, tarefa: (item: T) => Promise<R>): Promise<R[]> {
  const resultados: R[] = new Array(itens.length);
  let proximo = 0;
  async function trabalhador() {
    while (proximo < itens.length) {
      const i = proximo++;
      resultados[i] = await tarefa(itens[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
}
