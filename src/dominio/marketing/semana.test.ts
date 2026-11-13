import assert from "node:assert/strict";
import { test } from "node:test";

import { diasDeAjusteBr } from "@/lib/release-dates";

import {
  agendaDePublicacao,
  diaDaSemanaCurto,
  diaMes,
  episodioNaSemana,
  estreiaNoBrasil,
  generoExcluido,
  linkDoTitulo,
  organizarCandidatos,
  problemasDasInteracoes,
  problemasDeTexto,
  selecaoSemanaSchema,
  semanaIso,
  semanaSeguinte,
  streamingPorNome,
  streamingPrincipal,
  type Candidato,
} from "./semana";

const semana = { inicio: "2026-11-16", fim: "2026-11-22" };

test("semana seguinte a um domingo começa na segunda e termina no domingo", () => {
  assert.deepEqual(semanaSeguinte("2026-11-15"), semana);
});

test("semana seguinte a uma segunda pula para a outra segunda", () => {
  assert.deepEqual(semanaSeguinte("2026-11-16"), { inicio: "2026-11-23", fim: "2026-11-29" });
});

test("semana que atravessa o mês e o ano", () => {
  assert.deepEqual(semanaSeguinte("2026-12-27"), { inicio: "2026-12-28", fim: "2027-01-03" });
});

test("dia da semana, dia/mês e semana ISO", () => {
  assert.equal(diaDaSemanaCurto("2026-11-09"), "SEG");
  assert.equal(diaDaSemanaCurto("2026-11-21"), "SÁB");
  assert.equal(diaMes("2026-11-05"), "05/11");
  assert.equal(semanaIso("2026-11-16"), 47);
  assert.equal(semanaIso("2027-01-01"), 53);
});

test("agenda: carrossel no domingo anterior, quarta e sexta da semana", () => {
  assert.deepEqual(agendaDePublicacao(semana), {
    domingo: { data: "2026-11-15", hora: "20h" },
    quarta: { data: "2026-11-18", hora: "19h" },
    sexta: { data: "2026-11-20", hora: "19h" },
  });
});

const prime = { link: "", flatrate: [{ provider_id: 119, provider_name: "Prime", logo_path: null, display_priority: 2 }] };
const apple = { link: "", flatrate: [{ provider_id: 350, provider_name: "Apple TV", logo_path: null, display_priority: 1 }] };

test("streaming principal segue a ordem de destaque e ignora provedores fora da lista", () => {
  const regiao = {
    link: "",
    flatrate: [
      { provider_id: 999, provider_name: "Outro", logo_path: null, display_priority: 0 },
      { provider_id: 8, provider_name: "Netflix", logo_path: null, display_priority: 5 },
      { provider_id: 119, provider_name: "Prime", logo_path: null, display_priority: 3 },
    ],
  };
  assert.equal(streamingPrincipal(regiao)?.nome, "Prime Video");
  assert.equal(streamingPrincipal(undefined), null);
});

test("cor da pílula pelo nome, sem diferenciar maiúsculas", () => {
  assert.equal(streamingPorNome("netflix")?.cor, "#E50914");
  assert.equal(streamingPorNome("Cinemas")?.cor, "#F59E0B");
  assert.equal(streamingPorNome("Crunchyroll"), null);
});

test("reality, jornalismo, novela e entrevistas ficam de fora", () => {
  assert.equal(generoExcluido([10759, 10764]), true);
  assert.equal(generoExcluido([35, 18]), false);
});

test("episódio da semana usa a data do TMDb", () => {
  const ep = { season_number: 1, episode_number: 9, air_date: "2026-11-16" };
  assert.deepEqual(episodioNaSemana([null, ep], diasDeAjusteBr(prime, null), semana), { data: "2026-11-16", detalhe: "T1 E9" });
});

test("episódio da Apple TV sai no Brasil no dia seguinte", () => {
  const domingo = { season_number: 2, episode_number: 1, air_date: "2026-11-15" };
  assert.deepEqual(episodioNaSemana([domingo], diasDeAjusteBr(apple, null), semana), { data: "2026-11-16", detalhe: "T2 E1" });
  const ultimoDia = { season_number: 2, episode_number: 2, air_date: "2026-11-22" };
  assert.equal(episodioNaSemana([ultimoDia], diasDeAjusteBr(apple, null), semana), null);
});

test("ajuste manual leva o domingo do TMDb para a sexta", () => {
  const domingo = { season_number: 2, episode_number: 4, air_date: "2026-11-22" };
  assert.deepEqual(episodioNaSemana([domingo], -2, semana), { data: "2026-11-20", detalhe: "T2 E4" });
  // Domingo do TMDb na semana seguinte cai na sexta desta semana.
  const seguinte = { season_number: 2, episode_number: 5, air_date: "2026-11-23" };
  assert.deepEqual(episodioNaSemana([seguinte], -2, semana), { data: "2026-11-21", detalhe: "T2 E5" });
});

test("estreia no cinema usa a data ampla, não a pré-estreia limitada", () => {
  const datas = [
    { release_date: "2026-11-18T00:00:00.000Z", type: 2 },
    { release_date: "2026-11-19T00:00:00.000Z", type: 3 },
  ];
  assert.equal(estreiaNoBrasil(datas, "cinema", semana), "2026-11-19");
});

test("estreia limitada vale quando não há estreia ampla", () => {
  assert.equal(estreiaNoBrasil([{ release_date: "2026-11-20T00:00:00.000Z", type: 2 }], "cinema", semana), "2026-11-20");
});

test("filme que já estreou antes da semana não é estreia", () => {
  assert.equal(estreiaNoBrasil([{ release_date: "2026-03-25T00:00:00.000Z", type: 4 }], "digital", semana), null);
  assert.equal(estreiaNoBrasil([], "digital", semana), null);
});

test("link do título aponta para o site público", () => {
  assert.equal(linkDoTitulo("tv", 259909), "https://www.showradar.com.br/title/tv/259909");
});

test("candidatos ficam em ordem de data e popularidade, sem repetidos", () => {
  const c = (id: number, data: string, popularidade: number): Candidato => ({
    tipo: "tv", id, titulo: String(id), data, detalhe: "T1 E1", streaming: null, popularidade,
  });
  const lista = organizarCandidatos([c(1, "2026-11-17", 50), c(2, "2026-11-16", 10), c(3, "2026-11-16", 90), c(1, "2026-11-17", 50)]);
  assert.deepEqual(lista.map((x) => x.id), [3, 2, 1]);
});

test("regras de texto barram 'adicione no ShowRadar' e notificações", () => {
  assert.equal(problemasDeTexto("Cadastre-se grátis no ShowRadar").length, 0);
  assert.equal(problemasDeTexto("Adicione no ShowRadar agora").length, 1);
  assert.equal(problemasDeTexto("Receba notificação de cada episódio").length, 1);
});

const selecaoValida = {
  semana,
  carrossel: {
    titulos: [1, 2, 3, 4, 5].map((id) => ({ tipo: "tv", id })),
    legendas: { instagram: "No radar da semana. Link na bio!", x: "No radar da semana: showradar.com.br" },
  },
  quarta: {
    etiqueta: "Dica da quarta",
    titulo: "Não comece do zero",
    itens: ["Marque o que já viu", "Veja onde parou"],
    legendas: { instagram: "Dica. Link na bio", x: "Dica: showradar.com.br" },
  },
  sexta: {
    pergunta: "Qual é o seu estilo?",
    opcoes: ["Maratona", "Um por semana"],
    legendas: { instagram: "Vote! Link na bio", x: "Vote! showradar.com.br" },
  },
  interacoes: [{ dia: "2026-11-16", rede: "instagram", onde: "@netflixbrasil", texto: "Que estreia!" }],
};

test("seleção válida passa na validação", () => {
  const r = selecaoSemanaSchema.safeParse(selecaoValida);
  assert.equal(r.success, true, JSON.stringify(r.error?.issues));
});

test("seleção barra legenda sem 'link na bio', X sem link e opção de enquete longa", () => {
  const r = selecaoSemanaSchema.safeParse({
    ...selecaoValida,
    carrossel: { ...selecaoValida.carrossel, legendas: { instagram: "Sem chamada", x: "Sem link" } },
    sexta: { ...selecaoValida.sexta, opcoes: ["Uma opção que passa de vinte e cinco", "B"] },
  });
  assert.equal(r.success, false);
  const caminhos = r.error!.issues.map((i) => i.path.join("."));
  assert.ok(caminhos.includes("carrossel.legendas.instagram"));
  assert.ok(caminhos.includes("carrossel.legendas.x"));
  assert.ok(caminhos.includes("sexta.opcoes.0"));
});

test("no máximo 5 interações por dia, dentro da semana", () => {
  const selecao = selecaoSemanaSchema.parse({
    ...selecaoValida,
    interacoes: [
      ...Array.from({ length: 6 }, () => ({ dia: "2026-11-17", rede: "x", onde: "@x", texto: "oi" })),
      { dia: "2026-11-30", rede: "x", onde: "@x", texto: "oi" },
    ],
  });
  assert.deepEqual(problemasDasInteracoes(selecao), [
    "interação fora da semana: 2026-11-30",
    "6 interações em 2026-11-17 (máximo 5)",
  ]);
});
