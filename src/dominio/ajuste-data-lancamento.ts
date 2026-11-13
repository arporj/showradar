// Validação do ajuste manual da data de lançamento no Brasil (tela de admin e
// Server Action usam o mesmo esquema). A regra de aplicação fica em
// src/lib/release-dates.ts (diasDeAjusteBr).
import { z } from "zod";

export const AJUSTE_DIAS_MINIMO = -7;
export const AJUSTE_DIAS_MAXIMO = 7;

export const ajusteDataLancamentoSchema = z.object({
  tmdbId: z.coerce
    .number({ error: "Informe o número da série no TMDb." })
    .int("Informe só números.")
    .positive("Informe o número da série no TMDb."),
  dias: z.coerce
    .number({ error: "Informe quantos dias." })
    .int("Use um número inteiro de dias.")
    .min(AJUSTE_DIAS_MINIMO, `O ajuste vai de ${AJUSTE_DIAS_MINIMO} a +${AJUSTE_DIAS_MAXIMO} dias.`)
    .max(AJUSTE_DIAS_MAXIMO, `O ajuste vai de ${AJUSTE_DIAS_MINIMO} a +${AJUSTE_DIAS_MAXIMO} dias.`)
    .refine((d) => d !== 0, "Zero não muda nada. Para voltar à data do TMDb, remova o ajuste."),
  motivo: z
    .string()
    .trim()
    .min(5, "Explique em poucas palavras o motivo do ajuste.")
    .max(200, "Use no máximo 200 caracteres no motivo."),
});

export type AjusteDataLancamentoEntrada = z.input<typeof ajusteDataLancamentoSchema>;

/** Texto do ajuste para a tela: "2 dias antes", "1 dia depois". */
export function descreverAjuste(dias: number): string {
  const n = Math.abs(dias);
  return `${n} ${n === 1 ? "dia" : "dias"} ${dias < 0 ? "antes" : "depois"}`;
}
