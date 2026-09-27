import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { rafterStations } from "./geometry.ts";
import { calculateFlatRoof, DEFAULT_FLAT_INPUTS, FLAT_SPAN_TABLE_NOTE } from "./flat.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

test("level plane: rafter length is the plan run, one line of centres", () => {
  const r = calculateFlatRoof({
    ...DEFAULT_FLAT_INPUTS,
    lengthMm: 6000,
    widthMm: 3600,
    overhangMm: 450,
    pitchDeg: 0,
    spacingMm: 600,
  });
  assert.equal(r.planRunMm, 4500);
  assert.equal(r.rafterOverallMm, 4500);
  assert.equal(r.spanMm, 3600);
  assert.equal(r.riseMm, 0);
  assert.equal(r.rafterCount, 11);
  assert.equal(r.rafterCount, rafterStations(0, 6000, 600).length);
  assert.equal(r.lastBayMm, 600);
  assert.equal(r.stockMm, 4800);
  assert.equal("hipCount" in r, false);
  assert.equal("valleyCount" in r, false);
});

test("pitch lengthens the rafter from the plan run and leaves the span as the width", () => {
  const level = calculateFlatRoof({
    ...DEFAULT_FLAT_INPUTS,
    widthMm: 3600,
    overhangMm: 450,
    pitchDeg: 0,
  });
  const r = calculateFlatRoof({
    ...DEFAULT_FLAT_INPUTS,
    widthMm: 3600,
    overhangMm: 450,
    pitchDeg: 22.5,
  });
  assert.equal(r.planRunMm, level.planRunMm);
  assert.equal(r.spanMm, 3600);
  assert.equal(r.pitchDeg, 22.5);
  assert.equal(r.rafterOverallMm, 4870.8);
  assert.ok(r.rafterOverallMm > level.rafterOverallMm);
  assert.equal(r.stockMm, 5400);
  const at30 = calculateFlatRoof({
    ...DEFAULT_FLAT_INPUTS,
    widthMm: 3600,
    overhangMm: 450,
    pitchDeg: 30,
  });
  assert.equal(at30.rafterOverallMm, 5196.2);
  assert.equal(at30.riseMm, 2078.5);
});

test("pitch outside 0–60° is clamped and the rafter length stays finite", () => {
  const steep = calculateFlatRoof({ ...DEFAULT_FLAT_INPUTS, pitchDeg: 90, widthMm: 3600, overhangMm: 0 });
  const cap = calculateFlatRoof({ ...DEFAULT_FLAT_INPUTS, pitchDeg: 60, widthMm: 3600, overhangMm: 0 });
  assert.equal(steep.pitchDeg, 60);
  assert.equal(steep.rafterOverallMm, cap.rafterOverallMm);
  assert.equal(steep.rafterOverallMm, 7200);
  const dropped = calculateFlatRoof({ ...DEFAULT_FLAT_INPUTS, pitchDeg: -10, widthMm: 3600, overhangMm: 0 });
  assert.equal(dropped.pitchDeg, 0);
  assert.equal(dropped.rafterOverallMm, 3600);
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
  assert.match(r.spanNote, /single plane/i);
  assert.match(r.spanNote, /does not check the span table/i);
});

test("flat screen is one plane: length, width, pitch, calculated rafter, plan, isometric, back", () => {
  const page = readFileSync(path.join(root, "src/pages/FlatRoofPage.tsx"), "utf8");
  assert.match(page, /FLAT_SPAN_TABLE_NOTE|spanNote/);
  assert.match(page, /Check the span tables/);
  assert.match(page, /id="flat-length"/);
  assert.match(page, /id="flat-width"/);
  assert.match(page, /Building length in metres/);
  assert.match(page, /Building width in metres/);
  assert.match(page, /Pitch in degrees/);
  assert.match(page, /aria-label="Calculated rafter length"/);
  assert.match(page, /<output/);
  assert.match(page, /2D plan/);
  assert.match(page, /Isometric/);
  assert.match(page, /useUnlock/);
  assert.match(page, /ProSection/);
  assert.match(page, /aria-label="Back to roof choice"/);
  assert.match(page, /to="\/"/);
  assert.doesNotMatch(page, /setRafterLength|rafterLengthMm|Rafter length in metres|id="flat-span"|id="flat-rafter"/);
  assert.doesNotMatch(page, /L-shape|Hip \/ valley/);
});

test("pitched screen has Back to the flat or pitched landing", () => {
  const page = readFileSync(path.join(root, "src/pages/RoofSetoutPage.tsx"), "utf8");
  assert.match(page, /aria-label="Back to roof choice"/);
  assert.match(page, /to="\/"/);
  assert.match(page, /InputsPanel/);
  assert.match(page, /ResultsPanel/);
});
