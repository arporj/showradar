// Gera as artes (PNG 1080x1350) e o arquivo de legendas da semana a partir de
// marketing/semanas/<segunda>/selecao.json, escrito pela rotina de domingo.
// Uso: npm run renderizar-semana [-- AAAA-MM-DD]
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

import {
  CINEMAS,
  agendaDePublicacao,
  diaDaSemanaCurto,
  diaMes,
  linkDoTitulo,
  problemasDasInteracoes,
  selecaoSemanaSchema,
  semanaIso,
  streamingPorNome,
  type Candidato,
  type ItemDoCarrossel,
  type SelecaoSemana,
} from "@/dominio/marketing/semana";
import { tmdbFetch, type TmdbMovieDetail, type TmdbTvDetail } from "@/lib/tmdb";

import { emLotes, pastaDaSemana, semanaAlvo } from "./comum";
import { montarHtml, type ArteDoTitulo } from "./modelos/artes";

const IMAGEM_TMDB = "https://image.tmdb.org/t/p";

interface Imagem {
  file_path: string;
  iso_639_1: string | null;
  vote_average: number;
}

type Detalhe = (TmdbTvDetail | TmdbMovieDetail) & {
  production_companies?: { name: string }[];
  images?: { backdrops: Imagem[]; posters: Imagem[] };
};

function lerJson<T>(arquivo: string): T {
  if (!existsSync(arquivo)) throw new Error(`Arquivo não encontrado: ${arquivo}`);
  return JSON.parse(readFileSync(arquivo, "utf8")) as T;
}

function melhor(imagens: Imagem[], idiomas: (string | null)[]): string | null {
  for (const idioma of idiomas) {
    const achada = imagens.filter((i) => i.iso_639_1 === idioma).sort((a, b) => b.vote_average - a.vote_average)[0];
    if (achada) return achada.file_path;
  }
  return null;
}

async function baixar(caminhoTmdb: string, tamanho: string, destino: string): Promise<boolean> {
  const res = await fetch(`${IMAGEM_TMDB}/${tamanho}${caminhoTmdb}`);
  if (!res.ok) return false;
  writeFileSync(destino, Buffer.from(await res.arrayBuffer()));
  return true;
}

async function prepararTitulo(
  item: ItemDoCarrossel,
  candidatos: Candidato[],
  pastaImg: string,
  avisos: string[],
): Promise<ArteDoTitulo & { link: string; aConfirmar?: string }> {
  const candidato = candidatos.find((c) => c.tipo === item.tipo && c.id === item.id);
  const detalhe = await tmdbFetch<Detalhe>(`/${item.tipo}/${item.id}`, {
    append_to_response: "images",
    include_image_language: "pt,en,null",
  });
  const nomeTmdb = "name" in detalhe ? detalhe.name : detalhe.title;
  const titulo = item.titulo ?? candidato?.titulo ?? nomeTmdb;
  const data = item.data ?? candidato?.data;
  const detalheEp = item.detalhe ?? candidato?.detalhe ?? (item.tipo === "movie" ? "Filme" : null);
  if (!data || !detalheEp) throw new Error(`${titulo}: informe "data" e "detalhe" (não está no candidatos.json)`);
  const nomeStreaming = item.streaming ?? candidato?.streaming ?? null;
  const streaming = nomeStreaming ? streamingPorNome(nomeStreaming) : null;
  if (nomeStreaming && !streaming) avisos.push(`${titulo}: streaming "${nomeStreaming}" sem cor definida; saiu como "A confirmar"`);

  // Regra 1: só arte oficial. Fundo sem texto (idioma nulo) e pôster em português.
  const imagens = detalhe.images ?? { backdrops: [], posters: [] };
  const caminhoFundo = melhor(imagens.backdrops, [null, "pt", "en"]) ?? detalhe.backdrop_path;
  const caminhoPoster = melhor(imagens.posters, ["pt", "en", null]) ?? detalhe.poster_path;
  const base = `${item.tipo}-${item.id}`;
  const fundo = caminhoFundo && (await baixar(caminhoFundo, "w1280", path.join(pastaImg, `${base}-fundo.jpg`))) ? `img/${base}-fundo.jpg` : null;
  const poster = caminhoPoster && (await baixar(caminhoPoster, "w780", path.join(pastaImg, `${base}-poster.jpg`))) ? `img/${base}-poster.jpg` : null;
  if (!fundo && !poster) avisos.push(`${titulo}: sem imagem no TMDb; o slide saiu só com o fundo do ShowRadar`);

  // Regra 2: crédito de divulgação com o streaming ou, no cinema, a produtora.
  const dono = streaming && streaming.nome !== CINEMAS.nome ? streaming.nome : detalhe.production_companies?.[0]?.name;
  return {
    titulo,
    tituloCapa: item.tituloCurto ?? titulo,
    data,
    detalhe: detalheEp,
    streaming,
    poster,
    fundo,
    credito: dono ? `Imagem: divulgação/${dono}` : "Imagem: divulgação",
    link: linkDoTitulo(item.tipo, item.id),
    aConfirmar: item.aConfirmar ?? (streaming ? undefined : "streaming não confirmado"),
  };
}

function montarLegendas(selecao: SelecaoSemana, titulos: (ArteDoTitulo & { link: string; aConfirmar?: string })[], avisos: string[]) {
  const agenda = agendaDePublicacao(selecao.semana);
  const quando = (a: { data: string; hora: string }) => `${diaDaSemanaCurto(a.data)} ${diaMes(a.data)} às ${a.hora}`;
  const bloco = (nome: string, a: { data: string; hora: string }, arquivos: string, l: { instagram: string; x: string }) =>
    `## ${nome} — ${quando(a)}\n\nArtes: ${arquivos}\n\n**Instagram, Facebook e Threads**\n\n${l.instagram}\n\n**X**\n\n${l.x}\n`;
  const linhas = [
    `# Pacote da semana ${diaMes(selecao.semana.inicio)} a ${diaMes(selecao.semana.fim)}`,
    "",
    bloco("Carrossel \"No radar da semana\"", agenda.domingo, `carrossel-01 a carrossel-${String(titulos.length + 2).padStart(2, "0")}`, selecao.carrossel.legendas),
    "Títulos:",
    "",
    ...titulos.map((t) => `- ${diaDaSemanaCurto(t.data)} ${diaMes(t.data)} · ${t.titulo} · ${t.detalhe} · ${t.streaming?.nome ?? "streaming a confirmar"} · ${t.link}${t.aConfirmar ? ` · **a confirmar: ${t.aConfirmar}**` : ""}`),
    "",
    bloco("Post de quarta", agenda.quarta, "quarta.png", selecao.quarta.legendas),
    bloco("Enquete de sexta", agenda.sexta, "sexta.png (no X, use a enquete nativa, sem imagem)", selecao.sexta.legendas),
    `Opções da enquete: ${selecao.sexta.opcoes.map((o, i) => `${"ABCD"[i]}) ${o}`).join(" · ")}`,
    "",
    "## Interações da semana (pelo celular, perfis do ShowRadar)",
    "",
    ...selecao.interacoes.map((i, n) => `${n + 1}. ${diaDaSemanaCurto(i.dia)} ${diaMes(i.dia)} · ${i.rede} · ${i.onde}\n   ${i.texto}`),
    "",
  ];
  const duvidas = [...selecao.duvidas, ...avisos];
  if (duvidas.length) linhas.push("## Dúvidas e avisos", "", ...duvidas.map((d) => `- ${d}`), "");
  return linhas.join("\n");
}

async function principal() {
  const intervalo = semanaAlvo(process.argv[2]);
  const pasta = pastaDaSemana(intervalo);
  const bruto = lerJson<unknown>(path.join(pasta, "selecao.json"));
  const validacao = selecaoSemanaSchema.safeParse(bruto);
  if (!validacao.success) {
    const erros = validacao.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`selecao.json com problemas:\n${erros}`);
  }
  const selecao = validacao.data;
  if (selecao.semana.inicio !== intervalo.inicio) throw new Error(`selecao.json é da semana ${selecao.semana.inicio}, não ${intervalo.inicio}`);
  const problemas = problemasDasInteracoes(selecao);
  if (problemas.length) throw new Error(`Interações com problemas:\n${problemas.map((p) => `- ${p}`).join("\n")}`);

  const arquivoCandidatos = path.join(pasta, "candidatos.json");
  const candidatos = existsSync(arquivoCandidatos) ? lerJson<{ candidatos: Candidato[] }>(arquivoCandidatos).candidatos : [];

  const pastaImg = path.join(pasta, "img");
  const pastaPng = path.join(pasta, "png");
  rmSync(pastaPng, { recursive: true, force: true });
  mkdirSync(pastaImg, { recursive: true });
  mkdirSync(pastaPng, { recursive: true });

  const avisos: string[] = [];
  const titulos = await emLotes(selecao.carrossel.titulos, 3, (item) => prepararTitulo(item, candidatos, pastaImg, avisos));

  const css = readFileSync(path.join(import.meta.dirname, "modelos", "estilo.css"), "utf8");
  const arquivoHtml = path.join(pasta, "artes.html");
  writeFileSync(
    arquivoHtml,
    montarHtml({ semana: intervalo, numeroSemana: semanaIso(intervalo.inicio), titulos, quarta: selecao.quarta, sexta: selecao.sexta }, css),
  );

  const navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage({ viewport: { width: 2400, height: 3000 } });
    await pagina.goto(pathToFileURL(arquivoHtml).href, { waitUntil: "networkidle" });
    await pagina.evaluate(() => document.fonts.ready);
    avisos.push(...(await pagina.evaluate(() => (window as unknown as { ajustar: () => string[] }).ajustar())));
    for (const secao of await pagina.$$("section[data-arquivo]")) {
      const nome = await secao.getAttribute("data-arquivo");
      await secao.screenshot({ path: path.join(pastaPng, `${nome}.png`) });
    }
  } finally {
    await navegador.close();
  }

  const arquivoLegendas = path.join(pasta, "legendas.md");
  writeFileSync(arquivoLegendas, montarLegendas(selecao, titulos, avisos));
  console.log(`${titulos.length + 4} artes em ${path.relative(process.cwd(), pastaPng)}; legendas em ${path.relative(process.cwd(), arquivoLegendas)}.`);
  console.log(avisos.length ? `Avisos:\n${avisos.map((a) => `- ${a}`).join("\n")}` : "Sem avisos.");
}

principal().catch((erro: unknown) => {
  console.error("Falha ao gerar as artes:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
