import assert from "node:assert/strict";
import { test } from "node:test";

import { LAST_ACTIVE_WRITE_INTERVAL_MS, shouldRecordLastActive } from "./last-active";

const now = new Date("2026-11-08T12:00:00Z");

test("sem acesso registrado: grava", () => {
  assert.equal(shouldRecordLastActive(null, now), true);
});

test("acesso gravado há menos de uma hora: não grava de novo", () => {
  const lastActiveAt = new Date(now.getTime() - LAST_ACTIVE_WRITE_INTERVAL_MS + 1000);
  assert.equal(shouldRecordLastActive(lastActiveAt, now), false);
});

test("acesso gravado há exatamente uma hora ou mais: grava", () => {
  assert.equal(shouldRecordLastActive(new Date(now.getTime() - LAST_ACTIVE_WRITE_INTERVAL_MS), now), true);
  assert.equal(shouldRecordLastActive(new Date("2026-10-01T00:00:00Z"), now), true);
});

test("relógio do servidor atrás do valor gravado: não grava", () => {
  assert.equal(shouldRecordLastActive(new Date(now.getTime() + 60_000), now), false);
});
