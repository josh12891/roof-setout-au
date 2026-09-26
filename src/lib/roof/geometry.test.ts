import assert from "node:assert/strict";
import { test } from "vitest";
import { calculateRoof, DEFAULT_INPUTS, rafterStations } from "./geometry.ts";
import { junctionLayout } from "./junction.ts";

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
  assert.equal(wingC?.section, "wing");
  const minor = r.cuttingList.find((c) => c.name === "Minor ridge");
  assert.ok(minor && minor.overallMm > 1000);
  assert.equal(minor?.section, "wing");
  const cent = r.cuttingList.find((c) => c.name === "Centering rafters");
  const wingCent = r.cuttingList.find((c) => c.name === "Wing centering rafters");
  assert.ok(cent && wingCent && cent.count + wingCent.count >= 6);
  assert.equal(cent.section, "main");
  assert.equal(wingCent.section, "wing");
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
  const wingVerge = gable.cuttingList.find((c) => c.name === "Wing verge rafters");
  assert.equal(wingVerge?.section, "wing");
  assert.equal(wingVerge?.count, 2);
});

test("hip commons include every centre between the centering rafters", () => {
  const r = calculateRoof({ ...DEFAULT_INPUTS, leftEnd: "hip", rightEnd: "hip" });
  const stations = rafterStations(4000, 8000, 600);
  assert.equal(stations.length, 8);
  assert.equal(r.commonCount, (stations.length - 2) * 2);
  assert.equal(r.commonCount, 12);
  assert.equal(r.cuttingList.find((c) => c.name === "Common rafters")?.count, 12);
  assert.ok(r.cuttingList.every((c) => c.section === "main"));
});

test("gable commons keep the closing bay when length is not a multiple of spacing", () => {
  const r = calculateRoof({
    ...DEFAULT_INPUTS,
    lengthMm: 10000,
    leftEnd: "gable",
    rightEnd: "gable",
    spacingMm: 600,
  });
  assert.equal(rafterStations(0, 10000, 600).length, 18);
  assert.equal(r.commonCount, 36);
});

test("L-shape splits main and wing members and counts commons on both", () => {
  const r = calculateRoof({
    ...DEFAULT_INPUTS,
    junction: "L",
    wingSpanMm: 5000,
    wingProjectionMm: 7000,
    leftEnd: "hip",
    rightEnd: "hip",
  });
  const main = r.cuttingList.filter((c) => c.section === "main");
  const wing = r.cuttingList.filter((c) => c.section === "wing");
  assert.ok(main.length > 0 && wing.length > 0);
  const mainCommons = main.find((c) => c.name === "Common rafters");
  const wingCommons = wing.find((c) => c.name === "Wing common rafters");
  assert.equal(mainCommons?.count, 11);
  assert.ok(wingCommons && wingCommons.count >= 8);
  assert.notEqual(mainCommons?.toBirdsmouthMm, wingCommons?.toBirdsmouthMm);
  const mainHips = main.find((c) => c.name === "Hip rafters");
  const wingHips = wing.find((c) => c.name === "Wing hip rafters");
  assert.equal(mainHips?.count, 4);
  assert.equal(wingHips?.count, 2);
  assert.notEqual(mainHips?.toBirdsmouthMm, wingHips?.toBirdsmouthMm);
  assert.equal(r.cuttingList.find((c) => c.name === "Major ridge")?.section, "main");
  assert.equal(r.cuttingList.find((c) => c.name === "Minor ridge")?.section, "wing");
  assert.equal(r.cuttingList.find((c) => c.name === "Valley rafters")?.section, "wing");
});

test("T-shape keeps wing members in their own section even when spans match", () => {
  const r = calculateRoof({
    ...DEFAULT_INPUTS,
    junction: "T",
    wingSpanMm: 8000,
    wingProjectionMm: 6000,
  });
  const centMain = r.cuttingList.find((c) => c.name === "Centering rafters");
  const centWing = r.cuttingList.find((c) => c.name === "Wing centering rafters");
  assert.equal(centMain?.section, "main");
  assert.equal(centMain?.count, 4);
  assert.equal(centWing?.section, "wing");
  assert.ok(centWing && centWing.count >= 2);
  assert.ok((centMain?.count ?? 0) + (centWing?.count ?? 0) >= 6);
  const wingCommons = r.cuttingList.find((c) => c.name === "Wing common rafters");
  assert.ok(wingCommons && wingCommons.count >= 4);
  assert.equal(wingCommons?.section, "wing");
  assert.equal(r.cuttingList.find((c) => c.name === "Wing hip rafters")?.count, 2);
  assert.equal(r.cuttingList.find((c) => c.name === "Hip rafters")?.count, 4);
  assert.equal(r.commonCount, 6);
});

test("L broken hip jacks are counted at the longer plate-to-hip length", () => {
  const inputs = {
    ...DEFAULT_INPUTS,
    junction: "L" as const,
    lengthMm: 12000,
    widthMm: 8000,
    wingSpanMm: 5000,
    wingProjectionMm: 7000,
    spacingMm: 600 as const,
    leftEnd: "hip" as const,
    rightEnd: "hip" as const,
  };
  const j = junctionLayout(inputs);
  const r = calculateRoof(inputs);
  assert.ok(j);
  const jacks = j.members.filter((m) => m.kind === "broken-hip-jack");
  assert.equal(jacks.length, 2);
  const row = r.cuttingList.find((c) => c.name === "Broken hip jack rafters");
  assert.ok(row);
  assert.equal(row.section, "wing");
  assert.equal(row.count, 2);
  const longestPlan = Math.max(...jacks.map((m) => m.planMm));
  const geometrical = longestPlan / Math.cos(r.pitchRad);
  assert.ok(Math.abs(row.toBirdsmouthMm - (geometrical - r.hipDeductionMm)) < 0.2);
  assert.ok(row.overallMm > row.toBirdsmouthMm, "plate jack includes the eaves overhang");
  assert.equal(r.cuttingList.find((c) => c.name === "Broken hip")?.count, 1);
  assert.equal(r.brokenHipCount, 1);
});

test("T broken hip jacks are counted once per hip from the ridge", () => {
  const inputs = {
    ...DEFAULT_INPUTS,
    junction: "T" as const,
    lengthMm: 12000,
    widthMm: 8000,
    wingSpanMm: 5000,
    wingProjectionMm: 6000,
    spacingMm: 600 as const,
  };
  const j = junctionLayout(inputs);
  const r = calculateRoof(inputs);
  assert.ok(j);
  const jacks = j.members.filter((m) => m.kind === "broken-hip-jack");
  assert.equal(jacks.length, 4);
  const row = r.cuttingList.find((c) => c.name === "Broken hip jack rafters");
  assert.ok(row);
  assert.equal(row.section, "wing");
  assert.equal(row.count, 4);
  const longestPlan = Math.max(...jacks.map((m) => m.planMm));
  const geometrical = longestPlan / Math.cos(r.pitchRad);
  assert.ok(Math.abs(row.toBirdsmouthMm - geometrical) < 0.2);
  assert.ok(Math.abs(row.overallMm - geometrical) < 0.2);
  assert.equal(r.cuttingList.find((c) => c.name === "Broken hip")?.count, 2);
  assert.ok(jacks.every((m) => Math.min(m.y1, m.y2) > 8), "these do not sit on the plate");
});
