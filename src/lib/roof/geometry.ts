import type {
  Bevels,
  Birdsmouth,
  Creeper,
  MemberCut,
  RoofInputs,
  RoofResult,
} from "./types";
import { junctionLayout } from "./junction.ts";

const DEG = Math.PI / 180;
const MIN_SEAT_MM = 35; // AS 1684 F5 minimum seat; F7+ allows 30 — we keep 35.
const STOCK_MM = [2400, 2700, 3000, 3600, 4200, 4800, 5400, 6000, 7200, 8400];

function deg(rad: number): number {
  return rad / DEG;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round0(n: number): number {
  return Math.round(n);
}

function nextStock(lengthMm: number): number {
  const withWaste = lengthMm + 50;
  for (const s of STOCK_MM) {
    if (s >= withWaste) return s;
  }
  return Math.ceil(withWaste / 300) * 300;
}

export const PITCH_PRESETS = [15, 17.5, 22.5, 25, 26.5, 30, 35, 40, 45] as const;

export const MEMBER_PRESETS: { label: string; depth: number; breadth: number }[] = [
  { label: "70 × 35", depth: 70, breadth: 35 },
  { label: "70 × 45", depth: 70, breadth: 45 },
  { label: "90 × 35", depth: 90, breadth: 35 },
  { label: "90 × 45", depth: 90, breadth: 45 },
  { label: "120 × 45", depth: 120, breadth: 45 },
  { label: "140 × 35", depth: 140, breadth: 35 },
  { label: "140 × 45", depth: 140, breadth: 45 },
  { label: "190 × 35", depth: 190, breadth: 35 },
  { label: "190 × 45", depth: 190, breadth: 45 },
  { label: "240 × 35", depth: 240, breadth: 35 },
  { label: "240 × 45", depth: 240, breadth: 45 },
  { label: "290 × 45", depth: 290, breadth: 45 },
];

export const DEFAULT_INPUTS: RoofInputs = {
  lengthMm: 12000,
  widthMm: 8000,
  pitchDeg: 22.5,
  leftEnd: "hip",
  rightEnd: "hip",
  rafter: { depth: 190, breadth: 45 },
  ridge: { depth: 190, breadth: 35 },
  hip: { depth: 190, breadth: 45 },
  plateWidthMm: 90,
  spacingMm: 600,
  overhangMm: 450,
  junction: "none",
  wingSpanMm: 8000,
  wingProjectionMm: 4000,
  wingEnd: "hip",
  covering: "sheet",
};

function birdsmouth(inputs: RoofInputs, pitchRad: number): Birdsmouth {
  const maxPlumbMm = inputs.rafter.depth / 3;
  const rawPlumb = inputs.plateWidthMm * Math.tan(pitchRad);
  const limitedByCode = rawPlumb > maxPlumbMm + 0.05;
  const plumbDepthMm = Math.min(rawPlumb, maxPlumbMm);
  const seatMm =
    pitchRad > 0 ? Math.min(inputs.plateWidthMm, plumbDepthMm / Math.tan(pitchRad)) : inputs.plateWidthMm;
  const remainingDepthMm = inputs.rafter.depth - plumbDepthMm;
  const ok = plumbDepthMm <= maxPlumbMm + 0.05 && seatMm + 0.05 >= MIN_SEAT_MM;
  let note = `AS 1684: birdsmouth plumb depth must not exceed one-third of rafter depth (${round1(maxPlumbMm)} mm on ${inputs.rafter.depth} mm). Minimum seat 35 mm (F5).`;
  if (limitedByCode) {
    note = `Seat shortened to ${round1(seatMm)} mm so the plumb notch stays at 1/3 depth (${round1(maxPlumbMm)} mm). Check bearing on the ${inputs.plateWidthMm} mm plate.`;
  } else if (seatMm < MIN_SEAT_MM) {
    note = `Seat ${round1(seatMm)} mm is under the 35 mm AS 1684 F5 minimum. Flatten the pitch, widen the plate, or use a deeper rafter.`;
  }
  return {
    seatMm: round1(seatMm),
    plumbDepthMm: round1(plumbDepthMm),
    maxPlumbMm: round1(maxPlumbMm),
    remainingDepthMm: round1(remainingDepthMm),
    minSeatMm: MIN_SEAT_MM,
    limitedByCode,
    ok,
    note,
  };
}

function bevels(pitchRad: number): Bevels {
  const hipPitchRad = Math.atan(Math.tan(pitchRad) / Math.SQRT2);
  const sideCutRad = Math.atan(Math.cos(hipPitchRad));
  const jackSideRad = Math.atan(Math.cos(pitchRad));
  const backingRad = Math.atan(Math.sin(hipPitchRad));
  return {
    plumb: round1(deg(pitchRad)),
    seat: round1(90 - deg(pitchRad)),
    sideCut: round1(deg(jackSideRad)),
    hipSideCut: round1(deg(sideCutRad)),
    sawBevel: 45,
    backing: round1(deg(backingRad)),
    hipPitch: round1(deg(hipPitchRad)),
  };
}

function creepersForCorner(
  halfSpanMm: number,
  spacingMm: number,
  pitchRad: number,
  overhangMm: number,
  hipDeductionMm: number,
): Creeper[] {
  const out: Creeper[] = [];
  const maxPos = halfSpanMm - 8;
  let i = 1;
  for (let d = spacingMm; d < maxPos; d += spacingMm) {
    const run = d;
    const toHipCl = run / Math.cos(pitchRad);
    const toBirdsmouthMm = Math.max(0, toHipCl - hipDeductionMm);
    const overallMm = toBirdsmouthMm + overhangMm / Math.cos(pitchRad);
    out.push({
      index: i,
      fromCornerMm: round0(d),
      toBirdsmouthMm: round1(toBirdsmouthMm),
      overallMm: round1(overallMm),
      hand: "left",
    });
    i += 1;
  }
  return out;
}

export function calculateRoof(raw: RoofInputs): RoofResult {
  const warnings: string[] = [];
  const pitchDeg = Math.min(60, Math.max(5, raw.pitchDeg));
  const pitchRad = pitchDeg * DEG;
  const lengthMm = Math.max(1000, raw.lengthMm);
  const widthMm = Math.max(1000, raw.widthMm);
  const halfSpanMm = widthMm / 2;
  const ridgeThk = Math.max(19, raw.ridge.breadth);
  const overhangMm = Math.max(0, raw.overhangMm);
  const spacingMm = raw.spacingMm === 450 ? 450 : 600;

  const leftHip = raw.leftEnd === "hip";
  const rightHip = raw.rightEnd === "hip";

  let pyramid = false;
  const hipInset = halfSpanMm;
  let yRidge0 = leftHip ? hipInset : 0;
  let yRidge1 = lengthMm - (rightHip ? hipInset : 0);
  if (yRidge1 < yRidge0 + 20) {
    pyramid = true;
    yRidge0 = lengthMm / 2;
    yRidge1 = lengthMm / 2;
    if (leftHip && rightHip) {
      warnings.push(
        "Length is shorter than the span, so both hips meet as a pyramid — no ridge board. Swap length/width or lengthen the building for a ridge.",
      );
    }
  }

  const commonRunMm = Math.max(10, halfSpanMm - ridgeThk / 2);
  const riseMm = commonRunMm * Math.tan(pitchRad);
  const geometricalCommonMm = halfSpanMm / Math.cos(pitchRad);
  const cuttingCommonMm = commonRunMm / Math.cos(pitchRad);
  const commonToBirdsmouthMm = cuttingCommonMm;
  const commonOverhangMm = overhangMm / Math.cos(pitchRad);
  const commonOverallMm = commonToBirdsmouthMm + commonOverhangMm;
  const endJackCuttingMm = Math.max(0, geometricalCommonMm - raw.rafter.breadth / 2 / Math.cos(pitchRad));

  const hipPitchRad = Math.atan(Math.tan(pitchRad) / Math.SQRT2);
  const hipRunMm = commonRunMm * Math.SQRT2;
  const hipToBirdsmouthMm = Math.hypot(hipRunMm, riseMm);
  const hipOverhangPlan = overhangMm * Math.SQRT2;
  const hipOverhangMm = hipOverhangPlan / Math.cos(hipPitchRad);
  const hipOverallMm = hipToBirdsmouthMm + hipOverhangMm;

  // Regular valley (equal pitch, 90° wall corner) matches hip geometry.
  const valleyRunLimit = Math.min(commonRunMm, raw.wingSpanMm / 2, Math.max(100, raw.wingProjectionMm));
  const valleyToBirdsmouthMm =
    raw.junction === "none"
      ? hipToBirdsmouthMm
      : Math.hypot(valleyRunLimit * Math.SQRT2, valleyRunLimit * Math.tan(pitchRad));
  const valleyOverhangMm = hipOverhangMm;
  const valleyOverallMm = valleyToBirdsmouthMm + valleyOverhangMm;

  const ridgeLengthMm = pyramid
    ? 0
    : Math.max(0, yRidge1 - yRidge0) + (leftHip && rightHip ? raw.rafter.breadth : leftHip || rightHip ? raw.rafter.breadth / 2 : 0);
  const ridgeWithOverhangMm =
    ridgeLengthMm + (leftHip ? 0 : overhangMm) + (rightHip ? 0 : overhangMm);

  // Height from top of plate to top of ridge board (rafter top line at centre, minus birdsmouth drop).
  const bm = birdsmouth(raw, pitchRad);
  const rafterPerp = raw.rafter.depth;
  const ridgeHeightAbovePlateMm =
    halfSpanMm * Math.tan(pitchRad) + rafterPerp * Math.cos(pitchRad) - bm.plumbDepthMm;

  const hipCountBase = (leftHip ? 2 : 0) + (rightHip ? 2 : 0);
  const valleyCount = raw.junction === "none" ? 0 : raw.junction === "L" ? 1 : 2;
  const brokenHipCount = raw.junction === "none" ? 0 : Math.abs(raw.wingSpanMm - widthMm) < 40 ? 0 : raw.junction === "T" ? 2 : 1;
  const wingHipped = raw.junction !== "none" && raw.wingEnd !== "gable";
  const wingHips = wingHipped ? 2 : 0;
  const hipCount = hipCountBase + wingHips;
  const minorHalf = raw.junction === "none" ? 0 : raw.wingSpanMm / 2;
  // Ridge on the offset: from the outer hip inset (or gable) to the valley / major-ridge junction.
  const minorRidgeLengthMm =
    raw.junction === "none"
      ? 0
      : Math.max(
          0,
          raw.wingProjectionMm - (wingHipped ? minorHalf : 0) + Math.min(halfSpanMm, minorHalf || halfSpanMm),
        );
  const valleyJackCount = valleyCount * Math.max(0, Math.floor(Math.min(halfSpanMm, minorHalf || halfSpanMm) / spacingMm) - 1);
  const crippleJackCount = brokenHipCount * Math.max(0, Math.floor(Math.abs(halfSpanMm - (minorHalf || halfSpanMm)) / spacingMm));

  const jn = raw.junction === "none" ? null : junctionLayout(raw);
  let wingCommonCount = 0;
  let wingCenteringCount = 0;
  if (jn) {
    const wingVergeAdj = jn.wingHipped ? 0 : 2;
    wingCommonCount = Math.max(0, jn.members.filter((m) => m.kind === "common").length - wingVergeAdj);
    wingCenteringCount = jn.members.filter((m) => m.kind === "centering").length;
  }
  const actualValleyJackCount = jn
    ? jn.members.filter((m) => m.kind === "valley-jack").length
    : valleyJackCount;
  const actualCrippleCount = jn
    ? jn.members.filter((m) => m.kind === "cripple").length
    : crippleJackCount;
  const actualMinorRidgeMm = jn?.minorRidge
    ? Math.hypot(jn.minorRidge.x2 - jn.minorRidge.x1, jn.minorRidge.y2 - jn.minorRidge.y1)
    : minorRidgeLengthMm;

  const wingGeometricalMm = minorHalf > 0 ? minorHalf / Math.cos(pitchRad) : 0;
  const wingCommonToBM = minorHalf > 0 ? Math.max(10, minorHalf - ridgeThk / 2) / Math.cos(pitchRad) : 0;
  const wingCommonOverall = wingCommonToBM + commonOverhangMm;

  const hipDeductionMm = raw.hip.breadth / Math.SQRT2 / Math.cos(pitchRad);
  const commonDifferenceMm = spacingMm / Math.cos(pitchRad);

  const cornerCreepers = creepersForCorner(
    halfSpanMm,
    spacingMm,
    pitchRad,
    overhangMm,
    hipDeductionMm,
  );
  const creeperPerHipCorner = cornerCreepers.length;
  const hipCorners = hipCountBase + wingHips;
  const sameSpan = raw.junction === "none" || Math.abs(minorHalf - halfSpanMm) < 40;
  const wingCornerCreepers =
    wingHipped && minorHalf > 0
      ? sameSpan
        ? cornerCreepers
        : creepersForCorner(minorHalf, spacingMm, pitchRad, overhangMm, hipDeductionMm)
      : [];
  const creepers: Creeper[] = [];
  for (let c = 0; c < hipCountBase; c++) {
    const hand: "left" | "right" = c % 2 === 0 ? "left" : "right";
    for (const cr of cornerCreepers) {
      creepers.push({ ...cr, hand });
    }
  }

  // Commons: pairs along the ridge, both pitches.
  const ridgeSpanForRafters = pyramid ? 0 : ridgeLengthMm;
  const commonPairs = ridgeSpanForRafters <= 0 ? 0 : Math.floor(ridgeSpanForRafters / spacingMm) + 1;
  const hipEnds = pyramid ? 0 : (leftHip ? 1 : 0) + (rightHip ? 1 : 0);
  const crownEndCount = hipEnds;
  const centeringMain = hipEnds * 2;
  let commonCount = commonPairs * 2;
  if (centeringMain > 0) {
    commonCount = Math.max(0, commonCount - centeringMain);
  }
  if (jn && !pyramid) {
    let skippedLeft = 0;
    for (let y = yRidge0 + spacingMm; y < yRidge1 - 8; y += spacingMm) {
      if (y >= jn.y0 - 4 && y <= jn.y1 + 4) skippedLeft += 1;
    }
    commonCount = Math.max(0, commonCount - skippedLeft);
  }
  const centeringCount = centeringMain + wingCenteringCount;
  const vergeCount = (leftHip ? 0 : 2) + (rightHip ? 0 : 2) + (raw.junction !== "none" && !wingHipped ? 2 : 0);

  if (pitchDeg < 15 && raw.covering === "sheet") {
    warnings.push("Sheet roofs are commonly kept at 15° or steeper (check the profile — Trimdek is often 2° but most profiles want 5–15°).");
  }
  if (pitchDeg < 17.5 && raw.covering === "tile") {
    warnings.push("AS 2050 typically wants 17.5° minimum for concrete tiles. Confirm the tile manufacturer.");
  }
  if (spacingMm === 600 && raw.covering === "tile") {
    warnings.push("Tile roofs are often set at 450 mm centres. Check AS 1684 span tables for this member, span and roof load.");
  }
  const rlw = halfSpanMm + overhangMm;
  if (raw.rafter.depth < 140 && rlw > 1800) {
    warnings.push("Rafter looks light for this run — confirm against AS 1684.2 span tables for the stress grade and roof load width.");
  }
  if (!bm.ok) {
    warnings.push(bm.note);
  }

  const bv = bevels(pitchRad);

  const cuttingList: MemberCut[] = [];
  if (commonCount > 0) {
    cuttingList.push({
      name: "Common rafters",
      count: commonCount,
      toBirdsmouthMm: round1(commonToBirdsmouthMm),
      overallMm: round1(commonOverallMm),
      stockMm: nextStock(commonOverallMm),
      notes: `${raw.rafter.depth} × ${raw.rafter.breadth} · geometrical ${round1(geometricalCommonMm)} mm · cutting (half ridge off) ${round1(cuttingCommonMm)} mm · plumb ${bv.plumb}° · seat ${bv.seat}°`,
    });
  }
  if (centeringMain > 0 || (wingCenteringCount > 0 && sameSpan)) {
    cuttingList.push({
      name: "Centering rafters",
      count: sameSpan ? centeringMain + wingCenteringCount : centeringMain,
      toBirdsmouthMm: round1(commonToBirdsmouthMm),
      overallMm: round1(commonOverallMm),
      stockMm: nextStock(commonOverallMm),
      notes: `Last commons at each ridge end, against the hips${sameSpan && wingCenteringCount ? " (includes the wing)" : ""}. Same length as a common.`,
    });
  }
  if (wingCenteringCount > 0 && !sameSpan) {
    cuttingList.push({
      name: "Wing centering rafters",
      count: wingCenteringCount,
      toBirdsmouthMm: round1(wingCommonToBM),
      overallMm: round1(wingCommonOverall),
      stockMm: nextStock(wingCommonOverall),
      notes: "Last commons against the wing hips. Same length as a wing common.",
    });
  }
  if (crownEndCount > 0 || wingHipped) {
    cuttingList.push({
      name: "End jack rafters",
      count: crownEndCount + (wingHipped ? 1 : 0),
      toBirdsmouthMm: round1(endJackCuttingMm),
      overallMm: round1(endJackCuttingMm + commonOverhangMm),
      stockMm: nextStock(endJackCuttingMm + commonOverhangMm),
      notes: "Same geometrical length as a common. Cutting length reduced by half the common thickness (square off the plumb) where it butts the first common. Centre of each hip end.",
    });
  }
  if (wingCommonCount > 0) {
    cuttingList.push({
      name: "Wing common rafters",
      count: wingCommonCount,
      toBirdsmouthMm: round1(wingCommonToBM),
      overallMm: round1(wingCommonOverall),
      stockMm: nextStock(wingCommonOverall),
      notes: `${raw.rafter.depth} × ${raw.rafter.breadth} · intersecting roof, square off the minor ridge · geometrical ${round1(wingGeometricalMm)} mm · plumb ${bv.plumb}° · seat ${bv.seat}°`,
    });
  }
  if (vergeCount > 0) {
    cuttingList.push({
      name: "Gable verge / barge rafters",
      count: vergeCount,
      toBirdsmouthMm: round1(commonToBirdsmouthMm),
      overallMm: round1(commonOverallMm),
      stockMm: nextStock(commonOverallMm),
      notes: "Cut square to the gable. Add barge board separately.",
    });
  }
  if (hipCount > 0) {
    cuttingList.push({
      name: "Hip rafters",
      count: hipCount,
      toBirdsmouthMm: round1(hipToBirdsmouthMm),
      overallMm: round1(hipOverallMm),
      stockMm: nextStock(hipOverallMm),
      notes: `${raw.hip.depth} × ${raw.hip.breadth} · hip plumb ${bv.hipPitch}° · double cheek at ridge, saw bevel 45°`,
    });
  }
  if (valleyCount > 0) {
    cuttingList.push({
      name: "Valley rafters",
      count: valleyCount,
      toBirdsmouthMm: round1(valleyToBirdsmouthMm),
      overallMm: round1(valleyOverallMm),
      stockMm: nextStock(valleyOverallMm),
      notes: "Regular valley (equal pitch). Bevels as hip, cheeks inverted into the trough.",
    });
  }
  if (creeperPerHipCorner > 0 && (sameSpan ? hipCorners : hipCountBase) > 0) {
    const longest = cornerCreepers[cornerCreepers.length - 1];
    const mainJackCount = creeperPerHipCorner * (sameSpan ? hipCorners : hipCountBase);
    cuttingList.push({
      name: "Hip jack rafters",
      count: mainJackCount,
      toBirdsmouthMm: longest ? longest.toBirdsmouthMm : 0,
      overallMm: longest ? longest.overallMm : 0,
      stockMm: nextStock(longest ? longest.overallMm : 0),
      notes: `${creeperPerHipCorner} per hip · common diminish ${round1(commonDifferenceMm)} mm · half hip thickness off, square off the edge bevel · left and right hand · cheek ${bv.sideCut}° (saw tilt 45°)${sameSpan && wingHips ? " · includes wing hips" : ""}`,
    });
  }
  if (wingHipped && !sameSpan && wingCornerCreepers.length > 0) {
    const longestW = wingCornerCreepers[wingCornerCreepers.length - 1];
    cuttingList.push({
      name: "Wing hip jack rafters",
      count: wingCornerCreepers.length * wingHips,
      toBirdsmouthMm: longestW ? longestW.toBirdsmouthMm : 0,
      overallMm: longestW ? longestW.overallMm : 0,
      stockMm: nextStock(longestW ? longestW.overallMm : 0),
      notes: `${wingCornerCreepers.length} per wing hip · diminish from the wing span · cheek ${bv.sideCut}°`,
    });
  }
  if (actualValleyJackCount > 0) {
    const vjLongest = jn
      ? Math.max(
          0,
          ...jn.members.filter((m) => m.kind === "valley-jack").map((m) => m.planMm / Math.cos(pitchRad)),
        )
      : cornerCreepers[cornerCreepers.length - 1]?.toBirdsmouthMm ?? 0;
    cuttingList.push({
      name: "Valley jack rafters",
      count: actualValleyJackCount,
      toBirdsmouthMm: round1(vjLongest),
      overallMm: round1(vjLongest),
      stockMm: nextStock(vjLongest),
      notes: "From the ridge / minor ridge to the valley. Reduce geometrical length by half the valley thickness at the lower end and half the ridge at the top. Longest listed; they diminish by the common difference.",
    });
  }
  if (brokenHipCount > 0) {
    const brokenLen = Math.hypot(Math.abs(halfSpanMm - minorHalf) * Math.SQRT2, Math.abs(halfSpanMm - minorHalf) * Math.tan(pitchRad));
    cuttingList.push({
      name: "Broken hip",
      count: brokenHipCount,
      toBirdsmouthMm: round1(brokenLen),
      overallMm: round1(brokenLen),
      stockMm: nextStock(brokenLen),
      notes: "Shortened main hip between the major ridge and the minor ridge / valley intersection. Same bevels as a hip.",
    });
  }
  if (actualCrippleCount > 0) {
    const crLongest = jn
      ? Math.max(
          0,
          ...jn.members.filter((m) => m.kind === "cripple").map((m) => m.planMm / Math.cos(pitchRad)),
        )
      : cornerCreepers[Math.floor(cornerCreepers.length / 2)]?.toBirdsmouthMm ?? 0;
    cuttingList.push({
      name: "Cripple jack rafters",
      count: actualCrippleCount,
      toBirdsmouthMm: round1(crLongest),
      overallMm: round1(crLongest),
      stockMm: nextStock(crLongest),
      notes: "Between the valley and the hip. Reduce by half the valley and half the hip thickness. No birdsmouth.",
    });
  }
  if (actualMinorRidgeMm > 0) {
    cuttingList.push({
      name: "Minor ridge",
      count: 1,
      toBirdsmouthMm: round1(actualMinorRidgeMm),
      overallMm: round1(actualMinorRidgeMm),
      stockMm: nextStock(actualMinorRidgeMm),
      notes: `${raw.ridge.depth} × ${raw.ridge.breadth} · ridge on the intersecting roof, from the outer ${wingHipped ? "hip inset" : "gable"} to the valley / major-ridge junction.`,
    });
  }
  cuttingList.push({
    name: raw.junction === "none" ? "Ridge board" : "Major ridge",
    count: pyramid ? 0 : 1,
    toBirdsmouthMm: round1(ridgeLengthMm),
    overallMm: round1(ridgeWithOverhangMm),
    stockMm: pyramid ? 0 : nextStock(ridgeWithOverhangMm),
    notes: pyramid
      ? "No ridge — hips meet at the apex."
      : `${raw.ridge.depth} × ${raw.ridge.breadth} · ${leftHip && rightHip ? "between hips" : leftHip || rightHip ? "hip to gable" : "gable to gable"}`,
  });

  return {
    pitchDeg,
    pitchRad,
    halfSpanMm: round1(halfSpanMm),
    commonRunMm: round1(commonRunMm),
    riseMm: round1(riseMm),
    risePerMetreMm: round1(1000 * Math.tan(pitchRad)),
    commonToBirdsmouthMm: round1(commonToBirdsmouthMm),
    commonOverhangMm: round1(commonOverhangMm),
    commonOverallMm: round1(commonOverallMm),
    geometricalCommonMm: round1(geometricalCommonMm),
    cuttingCommonMm: round1(cuttingCommonMm),
    hipRunMm: round1(hipRunMm),
    hipToBirdsmouthMm: round1(hipToBirdsmouthMm),
    hipOverhangMm: round1(hipOverhangMm),
    hipOverallMm: round1(hipOverallMm),
    valleyToBirdsmouthMm: round1(valleyToBirdsmouthMm),
    valleyOverhangMm: round1(valleyOverhangMm),
    valleyOverallMm: round1(valleyOverallMm),
    ridgeLengthMm: round1(ridgeLengthMm),
    ridgeWithOverhangMm: round1(ridgeWithOverhangMm),
    ridgeHeightAbovePlateMm: round1(ridgeHeightAbovePlateMm),
    hipCount,
    valleyCount,
    commonCount,
    vergeCount,
    crownEndCount,
    centeringCount,
    commonDifferenceMm: round1(commonDifferenceMm),
    hipDeductionMm: round1(hipDeductionMm),
    creepers: cornerCreepers,
    creeperPerHipCorner,
    brokenHipCount,
    valleyJackCount: actualValleyJackCount,
    crippleJackCount: actualCrippleCount,
    minorRidgeLengthMm: round1(actualMinorRidgeMm),
    endJackCuttingMm: round1(endJackCuttingMm),
    bevels: bv,
    birdsmouth: bm,
    cuttingList,
    pyramid,
    warnings,
  };
}
