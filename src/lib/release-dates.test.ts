import assert from "node:assert/strict";
import { test } from "node:test";

import { diasDeAjusteBr, shiftDateString } from "./release-dates";

const apple = { link: "", flatrate: [{ provider_id: 350, provider_name: "Apple TV", logo_path: "", display_priority: 1 }] };
const paramount = { link: "", flatrate: [{ provider_id: 531, provider_name: "Paramount Plus", logo_path: "", display_priority: 1 }] };

test("sem ajuste manual, a Apple TV+ sai no Brasil no dia seguinte", () => {
  assert.equal(diasDeAjusteBr(apple, null), 1);
});

test("sem ajuste manual, os outros streamings ficam com a data do TMDb", () => {
  assert.equal(diasDeAjusteBr(paramount, null), 0);
  assert.equal(diasDeAjusteBr(null, undefined), 0);
});

test("o ajuste manual substitui a regra automática", () => {
  assert.equal(diasDeAjusteBr(paramount, -2), -2);
  assert.equal(diasDeAjusteBr(apple, -2), -2);
});

test("domingo do TMDb com ajuste de -2 vira sexta", () => {
  assert.equal(shiftDateString("2026-11-22", diasDeAjusteBr(paramount, -2)), "2026-11-20");
  assert.equal(shiftDateString("2026-11-01", -2), "2026-10-30");
});
