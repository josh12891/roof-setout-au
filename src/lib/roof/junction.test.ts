import assert from "node:assert/strict";
import { test } from "vitest";
import { DEFAULT_INPUTS } from "./geometry.ts";
import { junctionLayout, stationsFromCorner } from "./junction.ts";

const T = {
  ...DEFAULT_INPUTS,
  junction: "T" as const,
  wingSpanMm: 5000,
  wingProjectionMm: 4000,
  leftEnd: "hip" as const,
  rightEnd: "hip" as const,
};

const L = {
  ...DEFAULT_INPUTS,
  junction: "L" as const,
  wingSpanMm: 6000,
  wingProjectionMm: 4000,
  leftEnd: "hip" as const,
  rightEnd: "hip" as const,
};

test("T-junction wing hip jacks from the outer wall run along the wing (horizontal)", () => {
  const j = junctionLayout(T);
  assert.ok(j);
  const fromWall = j.members.filter(
    (m) => m.kind === "jack" && Math.abs(m.x1 - j.wingOuterX) < 2 && Math.abs(m.y1 - m.y2) < 2,
  );
  assert.ok(fromWall.length >= 3, `expected outer-wall hip jacks, got ${fromWall.length}`);
});

test("T-junction wing hip jacks from the side plates run square off the minor ridge (vertical)", () => {
  const j = junctionLayout(T);
  assert.ok(j);
  const fromSides = j.members.filter(
    (m) => m.kind === "jack" && Math.abs(m.x1 - m.x2) < 2 && (Math.abs(m.y1 - j.y0) < 2 || Math.abs(m.y1 - j.y1) < 2),
  );
  assert.ok(fromSides.length >= 2, `expected vertical side-plate jacks, got ${fromSides.length}`);
});

test("T-junction end jack runs along the wing centreline", () => {
  const j = junctionLayout(T);
  assert.ok(j);
  const crown = j.members.find((m) => m.kind === "crown");
  assert.ok(crown);
  assert.ok(Math.abs(crown.y1 - j.cy) < 2 && Math.abs(crown.y2 - j.cy) < 2);
  assert.equal(crown.tag, "end-jack");
});

test("T-junction centering rafters run square off the minor ridge", () => {
  const j = junctionLayout(T);
  assert.ok(j);
  const cents = j.members.filter((m) => m.kind === "centering");
  assert.ok(cents.length >= 2);
  for (const c of cents) {
    assert.ok(Math.abs(c.x1 - c.x2) < 2, "centering must be vertical (across the wing)");
  }
});

test("T-junction minor-side valley jacks run square off the minor ridge (vertical)", () => {
  const j = junctionLayout(T);
  assert.ok(j);
  const minorVJ = j.members.filter(
    (m) => m.kind === "valley-jack" && Math.abs(m.x1 - m.x2) < 2 && m.x1 > -8,
  );
  assert.ok(minorVJ.length >= 2, `expected vertical valley jacks on the minor, got ${minorVJ.length}`);
});

test("T-junction major-side valley jacks run square off the major ridge (horizontal)", () => {
  const j = junctionLayout(T);
  assert.ok(j);
  const majorVJ = j.members.filter(
    (m) => m.kind === "valley-jack" && Math.abs(m.y1 - m.y2) < 2 && Math.abs(m.x1 - j.majorHalf) < 2,
  );
  assert.ok(majorVJ.length >= 2, `expected horizontal valley jacks on the major, got ${majorVJ.length}`);
});

test("T-junction plan carries overall, projection and wing-span dims", () => {
  const j = junctionLayout(T);
  assert.ok(j);
  const names = j.dims.map((d) => d.label);
  for (const n of ["span", "long", "projection", "wing span", "overall"]) {
    assert.ok(names.includes(n), `missing dim ${n}`);
  }
  assert.equal(j.dims.find((d) => d.label === "projection")?.valueMm, 4000);
  assert.equal(j.dims.find((d) => d.label === "wing span")?.valueMm, 5000);
  assert.equal(j.valleys.length, 2);
  assert.ok(j.minorRidge);
  const ridgeRun = Math.hypot(j.minorRidge.x2 - j.minorRidge.x1, j.minorRidge.y2 - j.minorRidge.y1);
  assert.ok(ridgeRun > 100, "minor ridge must have a real length on the T");
});

test("L-junction wing members run square off the minor ridge and has one valley", () => {
  const j = junctionLayout(L);
  assert.ok(j);
  assert.equal(j.valleys.length, 1);
  assert.equal(j.flushNearEnd, true);
  const vertical = j.members.filter((m) => m.kind === "common" || m.kind === "centering");
  for (const m of vertical) {
    assert.ok(Math.abs(m.x1 - m.x2) < 2, `${m.kind} on the wing must be vertical`);
  }
  const crown = j.members.find((m) => m.kind === "crown");
  assert.ok(crown && Math.abs(crown.y1 - crown.y2) < 2);
});

test("stations from a corner stop short of the end jack", () => {
  assert.deepEqual(stationsFromCorner(4000, 600), [600, 1200, 1800, 2400, 3000, 3600]);
  assert.deepEqual(stationsFromCorner(2500, 600), [600, 1200, 1800, 2400]);
});

test("wing hip jacks meet the hip and are symmetric from both outer corners", () => {
  const j = junctionLayout({
    ...DEFAULT_INPUTS,
    junction: "T",
    wingSpanMm: 8000,
    wingProjectionMm: 4000,
    spacingMm: 600,
  });
  assert.ok(j);
  const outer = j.wingOuterX;
  const horiz = j.members.filter(
    (m) => m.kind === "jack" && Math.abs(m.x1 - outer) < 2 && Math.abs(m.y1 - m.y2) < 2,
  );
  assert.ok(horiz.length >= 4);
  for (const m of horiz) {
    const fromTop = m.y1 - j.y0;
    const fromBot = j.y1 - m.y1;
    const d = Math.min(fromTop, fromBot);
    assert.ok(Math.abs(m.x2 - (outer + d)) < 2, `jack at y=${m.y1} run ${m.x2 - outer} should equal d=${d} (meet the hip)`);
    assert.ok(m.x2 < outer + j.minorHalf - 4, "must not pass the ridge start / run through the hip");
  }
  const fromTop = horiz.filter((m) => m.y1 < j.cy).map((m) => Math.round(m.y1 - j.y0)).sort((a, b) => a - b);
  const fromBot = horiz.filter((m) => m.y1 > j.cy).map((m) => Math.round(j.y1 - m.y1)).sort((a, b) => a - b);
  assert.deepEqual(fromTop, fromBot, "jacks from both outer corners must match");
  assert.equal(fromTop[0], 600, "first jack is a full centre from the corner");
});

test("side-plate hip jacks meet the hip (do not continue past it)", () => {
  const j = junctionLayout({
    ...DEFAULT_INPUTS,
    junction: "T",
    wingSpanMm: 8000,
    wingProjectionMm: 4000,
    spacingMm: 600,
  });
  assert.ok(j);
  const top = j.members.filter(
    (m) => m.kind === "jack" && Math.abs(m.x1 - m.x2) < 2 && Math.abs(m.y1 - j.y0) < 2,
  );
  assert.ok(top.length >= 2);
  for (const m of top) {
    const d = m.x1 - j.wingOuterX;
    assert.ok(Math.abs(m.y2 - (j.y0 + d)) < 2, `vertical jack at x=${m.x1} should meet hip at y0+d`);
  }
});

test("valley jacks in the main hip zone stop on the hip", () => {
  const j = junctionLayout({
    ...DEFAULT_INPUTS,
    junction: "T",
    lengthMm: 12000,
    widthMm: 8000,
    wingSpanMm: 8000,
    wingProjectionMm: 4000,
    spacingMm: 600,
  });
  assert.ok(j);
  const half = 4000;
  const horiz = j.members.filter(
    (m) => (m.kind === "valley-jack" || m.kind === "cripple") && Math.abs(m.y1 - m.y2) < 2,
  );
  assert.ok(horiz.length >= 2);
  for (const m of horiz) {
    const y = m.y1;
    if (y >= half - 4) continue;
    const hipX = y;
    const right = Math.max(m.x1, m.x2);
    assert.ok(right <= hipX + 2, `at y=${y} member x=${right} must not pass the hip at ${hipX}`);
  }
});

test("gable wing has no outer hips or end jack", () => {
  const j = junctionLayout({
    ...DEFAULT_INPUTS,
    junction: "T",
    wingEnd: "gable",
    wingSpanMm: 8000,
    wingProjectionMm: 4000,
  });
  assert.ok(j);
  assert.equal(j.wingHipped, false);
  assert.equal(j.minorHips.length, 0);
  assert.equal(j.members.filter((m) => m.kind === "crown").length, 0);
  assert.equal(j.members.filter((m) => m.kind === "jack").length, 0);
  assert.ok(j.minorRidge);
  assert.ok(Math.abs(j.minorRidge.x1 - j.wingOuterX) < 2, "ridge runs to the gable wall");
  assert.equal(j.valleys.length, 2);
});

test("L flush side over the main is full commons, not empty", () => {
  const j = junctionLayout({
    ...DEFAULT_INPUTS,
    junction: "L",
    lengthMm: 12000,
    widthMm: 8000,
    wingSpanMm: 8000,
    wingProjectionMm: 4000,
    spacingMm: 600,
  });
  assert.ok(j);
  assert.equal(j.flushNearEnd, true);
  const flushCommons = j.members.filter(
    (m) =>
      m.kind === "common" &&
      Math.abs(m.x1 - m.x2) < 2 &&
      m.x1 > 8 &&
      m.x1 < j.majorHalf - 8 &&
      Math.min(m.y1, m.y2) < j.cy - 8,
  );
  assert.ok(
    flushCommons.length >= 4,
    `expected commons over the main on the flush side, got ${flushCommons.length}`,
  );
  for (const m of flushCommons) {
    const yLo = Math.min(m.y1, m.y2);
    const yHi = Math.max(m.y1, m.y2);
    assert.ok(Math.abs(yLo - j.y0) < 2, "flush common sits on the flush wall");
    assert.ok(Math.abs(yHi - j.cy) < 2, "flush common meets the minor ridge");
  }
  const tCommons = junctionLayout({
    ...DEFAULT_INPUTS,
    junction: "T",
    lengthMm: 12000,
    widthMm: 8000,
    wingSpanMm: 8000,
    wingProjectionMm: 4000,
  });
  const tOverMain = tCommons?.members.filter(
    (m) => m.kind === "common" && m.x1 > 8 && m.x1 < 4000,
  );
  assert.equal(tOverMain?.length ?? 0, 0, "T has valleys both sides — no flush commons over the main");
});
