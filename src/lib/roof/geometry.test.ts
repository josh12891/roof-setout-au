import assert from "node:assert/strict";
import { test } from "vitest";
import { calculateRoof, DEFAULT_INPUTS } from "./geometry.ts";

test("6 m span 22.5° common rafter matches the AU worked example", () => {
  const r = calculateRoof({
    ...DEFAULT_INPUTS,
    widthMm: 6000,
    lengthMm: 10000,
    pitchDeg: 22.5,
    rafter: { depth: 240, breadth: 45 },
    ridge: { depth: 190, breadth: 35 },
    overhangMm: 600,
    leftEnd: "gable",
    rightEnd: "gable",
  });
  assert.equal(r.commonRunMm, 2982.5);
  assert.ok(Math.abs(r.riseMm - 1235) < 1);
  assert.ok(Math.abs(r.commonToBirdsmouthMm - 3228) < 1);
  assert.ok(Math.abs(r.commonOverhangMm - 649) < 1);
  assert.ok(Math.abs(r.commonOverallMm - 3877) < 1);
  assert.ok(r.geometricalCommonMm > r.cuttingCommonMm);
});

test("hip is longer than common by the √2 plan run", () => {
  const r = calculateRoof({ ...DEFAULT_INPUTS, leftEnd: "hip", rightEnd: "hip" });
  assert.ok(r.hipToBirdsmouthMm > r.commonToBirdsmouthMm);
  assert.equal(r.hipCount, 4);
  assert.ok(r.commonDifferenceMm > 600);
  assert.equal(r.birdsmouth.maxPlumbMm, Math.round((190 / 3) * 10) / 10);
});

test("end jack and centering rafters match textbook set-out", () => {
  const r = calculateRoof({ ...DEFAULT_INPUTS, leftEnd: "hip", rightEnd: "hip" });
  assert.equal(r.crownEndCount, 2);
  assert.equal(r.centeringCount, 4);
  const crown = r.cuttingList.find((c) => c.name.startsWith("End jack"));
  const cent = r.cuttingList.find((c) => c.name === "Centering rafters");
  assert.ok(crown);
  assert.ok(cent);
  assert.ok(Math.abs(crown.toBirdsmouthMm - r.endJackCuttingMm) < 0.2);
  assert.equal(cent.toBirdsmouthMm, r.commonToBirdsmouthMm);
  assert.ok(crown.count >= 2);
  assert.equal(cent.count, 4);
  assert.ok(r.geometricalCommonMm > r.cuttingCommonMm);
});

test("L-junction produces a valley and wing hips", () => {
  const r = calculateRoof({
    ...DEFAULT_INPUTS,
    leftEnd: "hip",
    rightEnd: "hip",
    junction: "L",
    wingSpanMm: 6000,
    wingProjectionMm: 4000,
  });
  assert.equal(r.valleyCount, 1);
  assert.ok(r.hipCount >= 5);
  assert.ok(r.cuttingList.some((c) => c.name === "Valley rafters"));
  assert.ok(r.cuttingList.some((c) => c.name === "Minor ridge"));
});

test("T-junction cutting list includes wing rafters and both ridges", () => {
  const r = calculateRoof({
    ...DEFAULT_INPUTS,
    junction: "T",
    wingSpanMm: 8000,
    wingProjectionMm: 6000,
  });
  const names = r.cuttingList.map((c) => c.name);
  assert.ok(names.includes("Wing common rafters"));
  assert.ok(names.includes("Minor ridge"));
  assert.ok(names.includes("Major ridge"));
  const wingC = r.cuttingList.find((c) => c.name === "Wing common rafters");
  assert.ok(wingC && wingC.count >= 4);
  const minor = r.cuttingList.find((c) => c.name === "Minor ridge");
  assert.ok(minor && minor.overallMm > 1000);
  const cent = r.cuttingList.find((c) => c.name === "Centering rafters");
  assert.ok(cent && cent.count >= 6);
  assert.ok(r.valleyJackCount >= 10);
});

test("L-junction cutting list includes minor ridge and valley", () => {
  const r = calculateRoof({
    ...DEFAULT_INPUTS,
    junction: "L",
    wingSpanMm: 8000,
    wingProjectionMm: 6000,
  });
  const names = r.cuttingList.map((c) => c.name);
  assert.ok(names.includes("Wing common rafters"));
  assert.ok(names.includes("Minor ridge"));
  assert.ok(names.includes("Major ridge"));
  assert.ok(names.includes("Valley rafters"));
});

test("gable wing drops the two outer hips and adds verges", () => {
  const hip = calculateRoof({ ...DEFAULT_INPUTS, junction: "T", wingEnd: "hip" });
  const gable = calculateRoof({ ...DEFAULT_INPUTS, junction: "T", wingEnd: "gable" });
  assert.equal(hip.hipCount, gable.hipCount + 2);
  assert.equal(gable.vergeCount, hip.vergeCount + 2);
});
