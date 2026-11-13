// Lista as estreias da semana (séries e filmes no Brasil) a partir do TMDb e
// grava marketing/semanas/<segunda>/candidatos.json para a rotina escolher.
// Uso: npm run gerar-semana [-- AAAA-MM-DD]   (segunda-feira da semana; sem data, a próxima)
import { writeFileSync } from "node:fs";
import path from "node:path";

import {
  CINEMAS,
  PROVEDORES_MONITORADOS,
  episodioNaSemana,
  estreiaNoBrasil,
  generoExcluido,
  organizarCandidatos,
  streamingPrincipal,
  type Candidato,
  type DataDeLancamento,
  type Intervalo,
} from "@/dominio/marketing/semana";
import { listarAjustesDataLancamento } from "@/lib/ajustes-data-lancamento";
import { db } from "@/lib/db";
import { diasDeAjusteBr } from "@/lib/release-dates";
import {
  tmdbFetch,
  type TmdbMovieDetail,
  type TmdbSearchResult,
  type TmdbSeasonDetail,
  type TmdbTvDetail,
} from "@/lib/tmdb";

import { emLotes, pastaDaSemana, semanaAlvo } from "./comum";

const MAX_SERIES = 15;
const MAX_FILMES_CINEMA = 8;
const MAX_FILMES_DIGITAL = 8;
const POPULARIDADE_MINIMA_SEM_STREAMING = 10;

interface Pagina {
  results: TmdbSearchResult[];
}

interface DatasPorPais {
  results: { iso_3166_1: string; release_dates: DataDeLancamento[] }[];
}

async function descobrir(rota: "/discover/tv" | "/discover/movie", filtros: Record<string, string>, paginas: number) {
  const resultados: TmdbSearchResult[] = [];
  for (let page = 1; page <= paginas; page++) {
    const r = await tmdbFetch<Pagina>(rota, { ...filtros, sort_by: "popularity.desc", page: String(page) });
    resultados.push(...r.results);
  }
  return resultados;
}

async function series(intervalo: Intervalo, ajustes: Map<number, number>): Promise<Candidato[]> {
  const encontrados = await descobrir(
    "/discover/tv",
    {
      "air_date.gte": intervalo.inicio,
      "air_date.lte": intervalo.fim,
      watch_region: "BR",
      with_watch_providers: PROVEDORES_MONITORADOS.join("|"),
    },
    2,
  );
  const filtrados = encontrados.filter((s) => !generoExcluido(s.genre_ids ?? []));
  // A busca do TMDb filtra pela data dos EUA: uma série com ajuste manual
  // (ex.: domingo no TMDb, sexta no Brasil) pode lançar nesta semana com a
  // data americana fora dela, então as séries ajustadas entram sempre e o
  // filtro pela data brasileira acontece em episodioNaSemana.
  const ids = [...new Set([...filtrados.map((s) => s.id), ...ajustes.keys()])];
  const detalhes = await emLotes(ids, 5, (id) =>
    tmdbFetch<TmdbTvDetail>(`/tv/${id}`, { append_to_response: "watch/providers" }),
  );
  // O próximo episódio do TMDb é o desta semana, não o da semana alvo: a data
  // certa vem da lista de episódios da temporada em exibição.
  const temporadas = await emLotes(detalhes, 5, (d) => {
    const numero = (d.next_episode_to_air ?? d.last_episode_to_air)?.season_number;
    return numero === undefined ? Promise.resolve(null) : tmdbFetch<TmdbSeasonDetail>(`/tv/${d.id}/season/${numero}`);
  });
  const candidatos: Candidato[] = [];
  for (const [i, d] of detalhes.entries()) {
    const regiao = d["watch/providers"]?.results?.BR;
    const temporada = temporadas[i];
    const episodios = temporada
      ? temporada.episodes.map((e) => ({ ...e, season_number: temporada.season_number }))
      : [];
    const ep = episodioNaSemana(episodios, diasDeAjusteBr(regiao, ajustes.get(d.id)), intervalo);
    if (!ep) continue;
    candidatos.push({
      tipo: "tv",
      id: d.id,
      titulo: d.name,
      data: ep.data,
      detalhe: ep.detalhe,
      streaming: streamingPrincipal(regiao)?.nome ?? null,
      popularidade: Math.round(d.popularity),
    });
  }
  return candidatos.sort((a, b) => b.popularidade - a.popularidade).slice(0, MAX_SERIES);
}

async function filmes(intervalo: Intervalo, meio: "cinema" | "digital"): Promise<Candidato[]> {
  const filtros: Record<string, string> = {
    region: "BR",
    "release_date.gte": intervalo.inicio,
    "release_date.lte": intervalo.fim,
    with_release_type: meio === "cinema" ? "2|3" : "4",
  };
  // Filmes de streaming só ganham "onde assistir" no TMDb depois que estreiam,
  // por isso o digital não filtra por provedor: sem streaming vira "a confirmar".
  const encontrados = await descobrir("/discover/movie", filtros, 1);
  const detalhes = await emLotes(encontrados, 5, (m) =>
    tmdbFetch<TmdbMovieDetail & { release_dates?: DatasPorPais }>(`/movie/${m.id}`, {
      append_to_response: "release_dates,watch/providers",
    }),
  );
  const candidatos: Candidato[] = [];
  for (const d of detalhes) {
    const datasBr = d.release_dates?.results.find((r) => r.iso_3166_1 === "BR")?.release_dates ?? [];
    const data = estreiaNoBrasil(datasBr, meio, intervalo);
    if (!data) continue;
    const streaming = meio === "cinema" ? CINEMAS.nome : (streamingPrincipal(d["watch/providers"]?.results?.BR)?.nome ?? null);
    // Lançamento digital sem streaming e sem procura é aluguel avulso: fica de fora.
    if (!streaming && d.popularity < POPULARIDADE_MINIMA_SEM_STREAMING) continue;
    candidatos.push({
      tipo: "movie",
      id: d.id,
      titulo: d.title,
      data,
      detalhe: "Filme",
      streaming,
      popularidade: Math.round(d.popularity),
    });
  }
  const limite = meio === "cinema" ? MAX_FILMES_CINEMA : MAX_FILMES_DIGITAL;
  return candidatos.sort((a, b) => b.popularidade - a.popularidade).slice(0, limite);
}

async function principal() {
  const intervalo = semanaAlvo(process.argv[2]);
  const ajustes = new Map((await listarAjustesDataLancamento()).map((a) => [a.tmdbId, a.dias]));
  const [s, cinema, digital] = await Promise.all([
    series(intervalo, ajustes),
    filmes(intervalo, "cinema"),
    filmes(intervalo, "digital"),
  ]);
  const candidatos = organizarCandidatos([...s, ...cinema, ...digital]);
  const arquivo = path.join(pastaDaSemana(intervalo), "candidatos.json");
  writeFileSync(arquivo, JSON.stringify({ semana: intervalo, candidatos }, null, 1));
  const semStreaming = candidatos.filter((c) => !c.streaming).length;
  console.log(
    `Semana ${intervalo.inicio} a ${intervalo.fim}: ${s.length} séries, ${cinema.length} filmes no cinema, ` +
      `${digital.length} filmes no streaming (${semStreaming} sem streaming informado). Arquivo: ${path.relative(process.cwd(), arquivo)}`,
  );
}

principal()
  .catch((erro: unknown) => {
    console.error("Falha ao gerar a semana:", erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());
