import assert from "node:assert/strict";
import { test } from "node:test";

import { buildNotificationContent, NEW_EPISODE_BODY_PHRASES } from "./notification-content";

test("new_episode: título traz o nome da série primeiro e corpo usa a frase sorteada", () => {
  const { title, body } = buildNotificationContent(
    {
      name: "Silo",
      notificationType: "new_episode",
      episodeLabel: "T2E5",
      episodeName: "O Pacto",
    },
    () => "bora maratonar?",
  );

  assert.equal(title, "Silo: novo episódio hoje!");
  assert.equal(body, "T2E5 - O Pacto: bora maratonar?");
});

test("new_episode sem nome de episódio real: corpo cai só no rótulo TxEy", () => {
  const { body } = buildNotificationContent(
    {
      name: "Silo",
      notificationType: "new_episode",
      episodeLabel: "T2E5",
      episodeName: null,
    },
    () => "play liberado",
  );

  assert.equal(body, "T2E5: play liberado");
});

test("new_season: título traz o nome da série primeiro", () => {
  const { title, body } = buildNotificationContent(
    {
      name: "A Casa do Dragão",
      notificationType: "new_season",
      episodeLabel: "T3E1",
      episodeName: null,
    },
    () => "divirta-se!",
  );

  assert.equal(title, "A Casa do Dragão: nova temporada hoje!");
  assert.equal(body, "T3E1: divirta-se!");
});

test("new_movie_release: mantém título/corpo fixos, sem sortear frase", () => {
  const { title, body } = buildNotificationContent({
    name: "Duna: Parte Três",
    notificationType: "new_movie_release",
    episodeLabel: null,
    episodeName: null,
  });

  assert.equal(title, "Duna: Parte Três já está disponível");
  assert.equal(body, "Já disponível para assistir");
});

test("a frase sorteada por padrão sempre vem da lista de frases", () => {
  const { body } = buildNotificationContent({
    name: "Silo",
    notificationType: "new_episode",
    episodeLabel: "T2E5",
    episodeName: null,
  });

  const phrase = body.replace("T2E5: ", "");
  assert.ok(NEW_EPISODE_BODY_PHRASES.includes(phrase), `"${phrase}" deveria estar na lista de frases`);
});
