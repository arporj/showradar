// Regras do pacote semanal de posts do ShowRadar (carrossel "No radar da
// semana", post de quarta e enquete de sexta). Sem dependência de tela, banco
// ou rede: os scripts em scripts/marketing/ buscam os dados e usam estas
// funções para decidir o que entra e como é escrito.
import { z } from "zod";

import { hasDelayedBrRelease, shiftDateString } from "@/lib/release-dates";
import type { TmdbWatchProviderRegion } from "@/lib/tmdb";

/** Endereço público usado nos posts (nunca o localhost do ambiente local). */
export const SITE_PUBLICO = "https://www.showradar.com.br";

export type TipoTitulo = "tv" | "movie";

export interface Streaming {
  nome: string;
  cor: string;
}

export const CINEMAS: Streaming = { nome: "Cinemas", cor: "#F59E0B" };

// IDs de provedor do TMDb (região BR) → nome e cor da marca na pílula.
const STREAMINGS_POR_PROVEDOR: Record<number, Streaming> = {
  8: { nome: "Netflix", cor: "#E50914" },
  119: { nome: "Prime Video", cor: "#00A8E1" },
  337: { nome: "Disney+", cor: "#113CCF" },
  1899: { nome: "HBO Max", cor: "#5822B4" },
  384: { nome: "HBO Max", cor: "#5822B4" },
  531: { nome: "Paramount+", cor: "#0064FF" },
  350: { nome: "Apple TV", cor: "#555555" },
  307: { nome: "Globoplay", cor: "#FB0234" },
};

/** Provedores consultados no TMDb (parâmetro with_watch_providers). */
export const PROVEDORES_MONITORADOS = Object.keys(STREAMINGS_POR_PROVEDOR).map(Number);

const STREAMINGS_POR_NOME = new Map(
  [...Object.values(STREAMINGS_POR_PROVEDOR), CINEMAS].map((s) => [s.nome.toLowerCase(), s]),
);

/** Cor da pílula pelo nome do streaming; null se o nome não for conhecido. */
export function streamingPorNome(nome: string): Streaming | null {
  return STREAMINGS_POR_NOME.get(nome.trim().toLowerCase()) ?? null;
}

/** Streaming de assinatura principal no Brasil, pela ordem de destaque do TMDb. */
export function streamingPrincipal(regiaoBr: TmdbWatchProviderRegion | null | undefined): Streaming | null {
  const ordenados = [...(regiaoBr?.flatrate ?? [])].sort((a, b) => a.display_priority - b.display_priority);
  for (const p of ordenados) {
    const s = STREAMINGS_POR_PROVEDOR[p.provider_id];
    if (s) return s;
  }
  return null;
}

// Gêneros de TV do TMDb que não entram no radar: jornalismo, reality (inclui
// luta livre), novela diária e programa de entrevistas.
export const GENEROS_TV_EXCLUIDOS = [10763, 10764, 10766, 10767];

export function generoExcluido(generoIds: number[]): boolean {
  return generoIds.some((id) => GENEROS_TV_EXCLUIDOS.includes(id));
}

// ---------- Datas ----------

const DIAS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function utc(data: string): Date {
  return new Date(`${data}T00:00:00Z`);
}

export interface Intervalo {
  inicio: string;
  fim: string;
}

/** Semana de segunda a domingo que começa depois da data de referência (AAAA-MM-DD). */
export function semanaSeguinte(referencia: string): Intervalo {
  let inicio = shiftDateString(referencia, 1);
  while (utc(inicio).getUTCDay() !== 1) inicio = shiftDateString(inicio, 1);
  return { inicio, fim: shiftDateString(inicio, 6) };
}

export function dentroDoIntervalo(data: string | null | undefined, intervalo: Intervalo): data is string {
  return !!data && data >= intervalo.inicio && data <= intervalo.fim;
}

export function diaDaSemanaCurto(data: string): string {
  return DIAS[utc(data).getUTCDay()];
}

export function mesCurto(data: string): string {
  return MESES[utc(data).getUTCMonth()];
}

export function diaDoMes(data: string): string {
  return String(utc(data).getUTCDate()).padStart(2, "0");
}

/** dd/MM, como aparece nas legendas e na agenda de publicação. */
export function diaMes(data: string): string {
  return `${diaDoMes(data)}/${String(utc(data).getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Número da semana ISO 8601 (a que aparece na capa como "SEMANA 47"). */
export function semanaIso(data: string): number {
  const d = utc(data);
  const diaIso = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - diaIso);
  const inicioDoAno = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - inicioDoAno) / 86_400_000 + 1) / 7);
}

/** Dias de publicação: carrossel no domingo antes da semana, posts na quarta e sexta da semana. */
export function agendaDePublicacao(intervalo: Intervalo) {
  return {
    domingo: { data: shiftDateString(intervalo.inicio, -1), hora: "20h" },
    quarta: { data: shiftDateString(intervalo.inicio, 2), hora: "19h" },
    sexta: { data: shiftDateString(intervalo.inicio, 4), hora: "19h" },
  };
}

// ---------- Estreias ----------

export interface EpisodioRef {
  season_number: number;
  episode_number: number;
  air_date: string | null;
}

/**
 * Episódio que sai no Brasil dentro da semana. O TMDb registra a data dos EUA;
 * para a Apple TV a data brasileira é o dia seguinte (ver release-dates.ts).
 */
export function episodioNaSemana(
  episodios: (EpisodioRef | null | undefined)[],
  regiaoBr: TmdbWatchProviderRegion | null | undefined,
  intervalo: Intervalo,
): { data: string; detalhe: string } | null {
  const atraso = hasDelayedBrRelease(regiaoBr) ? 1 : 0;
  for (const ep of episodios) {
    if (!ep?.air_date) continue;
    const data = shiftDateString(ep.air_date, atraso);
    if (dentroDoIntervalo(data, intervalo)) {
      return { data, detalhe: `T${ep.season_number} E${ep.episode_number}` };
    }
  }
  return null;
}

export interface DataDeLancamento {
  release_date: string;
  /** 1 pré-estreia, 2 cinema limitado, 3 cinema, 4 digital, 5 físico, 6 TV. */
  type: number;
}

/**
 * Data de estreia no Brasil dentro da semana. Cinema usa a estreia ampla
 * (tipo 3) e só cai para a limitada (tipo 2) se não houver ampla.
 */
export function estreiaNoBrasil(
  datasBr: DataDeLancamento[],
  meio: "cinema" | "digital",
  intervalo: Intervalo,
): string | null {
  const tipos = meio === "cinema" ? [3, 2] : [4];
  for (const tipo of tipos) {
    const datas = datasBr
      .filter((d) => d.type === tipo)
      .map((d) => d.release_date.slice(0, 10))
      .sort();
    if (datas.length === 0) continue;
    return dentroDoIntervalo(datas[0], intervalo) ? datas[0] : null;
  }
  return null;
}

export function linkDoTitulo(tipo: TipoTitulo, id: number): string {
  return `${SITE_PUBLICO}/title/${tipo}/${id}`;
}

export interface Candidato {
  tipo: TipoTitulo;
  id: number;
  titulo: string;
  data: string;
  /** "T1 E9" para episódio de série, "Filme" para filme. */
  detalhe: string;
  /** null quando o TMDb ainda não informa onde assistir no Brasil. */
  streaming: string | null;
  popularidade: number;
}

/** Ordena por data e, no mesmo dia, pelos mais populares; remove repetidos. */
export function organizarCandidatos(candidatos: Candidato[]): Candidato[] {
  const vistos = new Set<string>();
  return [...candidatos]
    .sort((a, b) => a.data.localeCompare(b.data) || b.popularidade - a.popularidade)
    .filter((c) => {
      const chave = `${c.tipo}/${c.id}`;
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });
}

// ---------- Regras de texto ----------

const EXPRESSOES_PROIBIDAS: [RegExp, string][] = [
  [/adicion\w* no showradar/i, 'não use "adicione no ShowRadar"; as pessoas se cadastram no ShowRadar'],
  [/notifica[çc]/i, "não mencione notificações"],
  [/\bpush\b/i, "não mencione notificações push"],
  [/e-?mail/i, "não mencione e-mail"],
];

/** Problemas de comunicação num texto de post (lista vazia = texto aprovado). */
export function problemasDeTexto(texto: string): string[] {
  return EXPRESSOES_PROIBIDAS.filter(([re]) => re.test(texto)).map(([, motivo]) => motivo);
}

/** Limite do X; links contam 23 caracteres, então o limite real fica folgado. */
export const LIMITE_X = 280;
/** Limite de cada opção de enquete nativa do X. */
export const LIMITE_OPCAO_ENQUETE_X = 25;

// ---------- Seleção da semana (arquivo escrito pela rotina) ----------

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data no formato AAAA-MM-DD");

const legendas = z
  .object({
    instagram: z.string().min(1),
    x: z.string().min(1).max(LIMITE_X, `a legenda do X passa de ${LIMITE_X} caracteres`),
  })
  .superRefine((l, ctx) => {
    if (!/link na bio/i.test(l.instagram)) {
      ctx.addIssue({ code: "custom", path: ["instagram"], message: 'a legenda do Instagram precisa de "link na bio"' });
    }
    if (!/showradar\.com\.br/i.test(l.x)) {
      ctx.addIssue({ code: "custom", path: ["x"], message: "a legenda do X precisa do link showradar.com.br" });
    }
    for (const [campo, texto] of Object.entries(l)) {
      for (const motivo of problemasDeTexto(texto)) ctx.addIssue({ code: "custom", path: [campo], message: motivo });
    }
  });

const textoDeArte = z.string().superRefine((texto, ctx) => {
  for (const motivo of problemasDeTexto(texto)) ctx.addIssue({ code: "custom", message: motivo });
});

export const itemDoCarrosselSchema = z.object({
  tipo: z.enum(["tv", "movie"]),
  id: z.number().int().positive(),
  /** Nome menor para a capa, quando o título completo não cabe. */
  tituloCurto: z.string().max(22).optional(),
  // Campos abaixo só são necessários para títulos que não vieram do candidatos.json.
  titulo: z.string().optional(),
  data: data.optional(),
  detalhe: z.string().optional(),
  streaming: z.string().optional(),
  /** Data ou streaming não confirmados: aparece na mensagem para o André. */
  aConfirmar: z.string().optional(),
});

export const selecaoSemanaSchema = z.object({
  semana: z.object({ inicio: data, fim: data }),
  carrossel: z.object({
    titulos: z.array(itemDoCarrosselSchema).min(5).max(6),
    legendas,
  }),
  quarta: z.object({
    etiqueta: textoDeArte.pipe(z.string().min(1).max(24)),
    titulo: textoDeArte.pipe(z.string().min(1).max(60)),
    itens: z.array(textoDeArte.pipe(z.string().min(1).max(80))).min(2).max(4),
    legendas,
  }),
  sexta: z.object({
    pergunta: textoDeArte.pipe(z.string().min(1).max(90)),
    opcoes: z
      .array(z.string().min(1).max(LIMITE_OPCAO_ENQUETE_X, `cada opção da enquete do X tem no máximo ${LIMITE_OPCAO_ENQUETE_X} caracteres`))
      .min(2)
      .max(4),
    legendas,
  }),
  interacoes: z
    .array(
      z.object({
        dia: data,
        rede: z.enum(["instagram", "x", "facebook", "threads"]),
        onde: z.string().min(1),
        texto: textoDeArte.pipe(z.string().min(1)),
      }),
    )
    .max(35),
  duvidas: z.array(z.string()).default([]),
});

export type SelecaoSemana = z.infer<typeof selecaoSemanaSchema>;
export type ItemDoCarrossel = z.infer<typeof itemDoCarrosselSchema>;

/** Até 5 interações por dia, todas dentro da semana. */
export function problemasDasInteracoes(selecao: SelecaoSemana): string[] {
  const intervalo = selecao.semana;
  const porDia = new Map<string, number>();
  const problemas: string[] = [];
  for (const i of selecao.interacoes) {
    if (!dentroDoIntervalo(i.dia, intervalo)) problemas.push(`interação fora da semana: ${i.dia}`);
    porDia.set(i.dia, (porDia.get(i.dia) ?? 0) + 1);
  }
  for (const [dia, total] of porDia) {
    if (total > 5) problemas.push(`${total} interações em ${dia} (máximo 5)`);
  }
  return problemas;
}
