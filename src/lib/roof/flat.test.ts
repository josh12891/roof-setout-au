import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { rafterStations } from "./geometry.ts";
import { calculateFlatRoof, DEFAULT_FLAT_INPUTS, FLAT_SPAN_TABLE_NOTE } from "./flat.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

test("flat rafters are span plus eaves each side, one line of centres", () => {
  const r = calculateFlatRoof({
    ...DEFAULT_FLAT_INPUTS,
    lengthMm: 6000,
    spanMm: 3600,
    overhangMm: 450,
    spacingMm: 600,
  });
  assert.equal(r.rafterOverallMm, 4500);
  assert.equal(r.rafterCount, 11);
  assert.equal(r.rafterCount, rafterStations(0, 6000, 600).length);
  assert.equal(r.lastBayMm, 600);
  assert.equal(r.stockMm, 4800);
  assert.equal("hipCount" in r, false);
  assert.equal("valleyCount" in r, false);
});

test("flat count keeps the short closing bay and does not double like a pitched pair", () => {
  const r = calculateFlatRoof({
    ...DEFAULT_FLAT_INPUTS,
    lengthMm: 10000,
    spacingMm: 600,
  });
  assert.equal(r.rafterCount, rafterStations(0, 10000, 600).length);
  assert.equal(r.rafterCount, 18);
  assert.equal(r.lastBayMm, 400);
});

test("flat span note tells a carpenter to check the span tables", () => {
  const r = calculateFlatRoof(DEFAULT_FLAT_INPUTS);
  assert.equal(r.spanNote, FLAT_SPAN_TABLE_NOTE);
  assert.match(r.spanNote, /span tables/i);
  assert.match(r.spanNote, /rafter span/i);
  assert.match(r.spanNote, /does not check the span table/i);
});

test("flat screen shows the span note and stays off hips, valleys and Pro", () => {
  const page = readFileSync(path.join(root, "src/pages/FlatRoofPage.tsx"), "utf8");
  assert.match(page, /FLAT_SPAN_TABLE_NOTE|spanNote/);
  assert.match(page, /Check the span tables/);
  assert.doesNotMatch(page, /ProSection|useUnlock|L-shape|pitchDeg|Hip \/ valley/);
});
