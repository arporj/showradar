import assert from "node:assert/strict";
import { test } from "node:test";

import { ajusteDataLancamentoSchema, descreverAjuste } from "./ajuste-data-lancamento";

const valido = { tmdbId: "259909", dias: "-2", motivo: "Paramount+ lança na sexta" };

test("aceita o ajuste de Dexter vindo do formulário (texto)", () => {
  assert.deepEqual(ajusteDataLancamentoSchema.parse(valido), { tmdbId: 259909, dias: -2, motivo: "Paramount+ lança na sexta" });
});

test("recusa zero dias e valores fora de -7 a +7", () => {
  for (const dias of ["0", "-8", "8", "1.5", "abc"]) {
    assert.equal(ajusteDataLancamentoSchema.safeParse({ ...valido, dias }).success, false, `dias=${dias}`);
  }
});

test("recusa número do TMDb inválido e motivo curto", () => {
  assert.equal(ajusteDataLancamentoSchema.safeParse({ ...valido, tmdbId: "0" }).success, false);
  assert.equal(ajusteDataLancamentoSchema.safeParse({ ...valido, tmdbId: "" }).success, false);
  assert.equal(ajusteDataLancamentoSchema.safeParse({ ...valido, motivo: "   ok  " }).success, false);
});

test("descreve o ajuste em português", () => {
  assert.equal(descreverAjuste(-2), "2 dias antes");
  assert.equal(descreverAjuste(1), "1 dia depois");
});
