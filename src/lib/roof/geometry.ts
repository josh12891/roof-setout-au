import type {
  BirdsmouthInput,
  BirdsmouthResult,
  CommonRafterInput,
  CommonRafterResult,
  CreeperInput,
  CreeperMember,
  CreeperResult,
  GableEndsInput,
  GableEndsResult,
  HipValleyInput,
  HipValleyResult,
  PitchInput,
} from "./types";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export function clampPositive(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Resolve pitch to radians and degrees. Rise:run uses any consistent units. */
export function pitchFromInput(pitch: PitchInput): { radians: number; degrees: number } {
  if (pitch.kind === "degrees") {
    const degrees = Number.isFinite(pitch.degrees) ? pitch.degrees : 0;
    return { degrees, radians: degrees * DEG };
  }
  const rise = pitch.rise;
  const run = pitch.run;
  if (!Number.isFinite(rise) || !Number.isFinite(run) || run === 0) {
    return { degrees: 0, radians: 0 };
  }
  const radians = Math.atan(rise / run);
  return { radians, degrees: radians * RAD };
}

export function risePer300FromPitch(radians: number): number {
  return Math.tan(radians) * 300;
}

export function birdsmouthFromSeat(
  pitchRadians: number,
  input: BirdsmouthInput,
): BirdsmouthResult {
  const seatMm = clampPositive(input.seatMm);
  const rafterDepthMm = clampPositive(input.rafterDepthMm);
  const heelMm = seatMm * Math.tan(pitchRadians);
  const plumbMm = pitchRadians === 0 ? seatMm : seatMm / Math.cos(pitchRadians);
  const remainingDepthMm = rafterDepthMm - heelMm;
  return {
    seatMm,
    heelMm,
    plumbMm,
    remainingDepthMm,
    overcut: remainingDepthMm < 0,
  };
}

/**
 * Equal-pitch gable/common rafter from full span.
 * Run is half span to the ridge centreline.
 */
export function calculateCommonRafter(input: CommonRafterInput): CommonRafterResult {
  const { radians, degrees } = pitchFromInput(input.pitch);
  const spanMm = clampPositive(input.spanMm);
  const overhangMm = clampPositive(input.overhangMm);
  const runMm = spanMm / 2;
  const riseMm = runMm * Math.tan(radians);
  const cos = Math.cos(radians);
  const slopeLengthMm = cos === 0 ? 0 : runMm / cos;
  const totalLengthMm = cos === 0 ? 0 : (runMm + overhangMm) / cos;
  const birdsmouth = birdsmouthFromSeat(radians, input.birdsmouth);

  return {
    pitchDegrees: degrees,
    runMm,
    riseMm,
    slopeLengthMm,
    totalLengthMm,
    risePer300: risePer300FromPitch(radians),
    plumbCutDegrees: degrees,
    levelCutDegrees: Math.max(0, 90 - degrees),
    birdsmouth,
  };
}

/**
 * Hip or valley on an equal-pitch roof.
 * Plan run uses the corner bisector: run / sin(halfCorner) for the plan length
 * of the member when half-span equals `runMm` on both sides of a square corner
 * that reduces to run * √2.
 */
export function calculateHipValley(input: HipValleyInput): HipValleyResult {
  const { radians: commonRad, degrees: commonDeg } = pitchFromInput(input.pitch);
  const runMm = clampPositive(input.runMm);
  const overhangMm = clampPositive(input.overhangMm);
  const corner = clampPositive(input.planCornerDegrees) || 90;
  const halfCornerRad = (corner / 2) * DEG;
  const sinHalf = Math.sin(halfCornerRad);
  const planRunMm = sinHalf === 0 ? 0 : runMm / sinHalf;
  const riseMm = runMm * Math.tan(commonRad);
  const hipRad = planRunMm === 0 ? 0 : Math.atan(riseMm / planRunMm);
  const hipDeg = hipRad * RAD;
  const cosHip = Math.cos(hipRad);
  const slopeLengthMm = cosHip === 0 ? 0 : planRunMm / cosHip;
  const overhangPlan = sinHalf === 0 ? 0 : overhangMm / sinHalf;
  const totalLengthMm = cosHip === 0 ? 0 : (planRunMm + overhangPlan) / cosHip;

  // Backing bevel: atan(sin(hipPitch) * tan(halfCorner))
  const backingRad = Math.atan(Math.sin(hipRad) * Math.tan(halfCornerRad));
  // Side cut at ridge for equal pitch ≈ atan(cos(common) * tan(halfCorner))
  const sideCutRad = Math.atan(Math.cos(commonRad) * Math.tan(halfCornerRad));

  return {
    kind: input.kind,
    pitchDegrees: commonDeg,
    commonPitchDegrees: commonDeg,
    planRunMm,
    riseMm,
    hipPitchDegrees: hipDeg,
    slopeLengthMm,
    totalLengthMm,
    backingDegrees: backingRad * RAD,
    sideCutDegrees: sideCutRad * RAD,
    plumbCutDegrees: hipDeg,
    levelCutDegrees: Math.max(0, 90 - hipDeg),
  };
}

/**
 * Hip creepers from the corner along one wall plate.
 * Equal-pitch square hip: each bay reduces remaining common run by centres.
 * Common difference (incremental decrease on the slope) ≈ centres / cos(pitch).
 */
export function calculateCreepers(input: CreeperInput): CreeperResult {
  const { radians, degrees } = pitchFromInput(input.pitch);
  const runMm = clampPositive(input.runMm);
  const centresMm = clampPositive(input.centresMm);
  const firstOffsetMm = clampPositive(input.firstOffsetMm);
  const overhangMm = clampPositive(input.overhangMm);
  const hipHalf = clampPositive(input.hipThicknessMm) / 2;
  const cos = Math.cos(radians);

  // On plan, hip sits on the 45° bisector for a 90° corner. Moving `centres`
  // along the plate reduces the remaining common run by the same amount.
  const commonDifferenceMm = cos === 0 ? 0 : centresMm / cos;

  const members: CreeperMember[] = [];
  if (centresMm <= 0 || runMm <= 0) {
    return {
      pitchDegrees: degrees,
      commonDifferenceMm,
      reductionPerBayMm: commonDifferenceMm,
      members,
      count: 0,
    };
  }

  let index = 1;
  for (let plateMarkMm = firstOffsetMm; plateMarkMm < runMm - 1e-6; plateMarkMm += centresMm) {
    // Remaining run to hip face, allowing half hip thickness on the mitre.
    const remainingRunMm = Math.max(0, runMm - plateMarkMm - hipHalf);
    if (remainingRunMm <= 0) break;
    const slopeLengthMm = cos === 0 ? 0 : remainingRunMm / cos;
    const totalLengthMm = cos === 0 ? 0 : (remainingRunMm + overhangMm) / cos;
    members.push({
      index,
      plateMarkMm,
      remainingRunMm,
      slopeLengthMm,
      totalLengthMm,
    });
    index += 1;
    if (index > 200) break;
  }

  return {
    pitchDegrees: degrees,
    commonDifferenceMm,
    reductionPerBayMm: commonDifferenceMm,
    members,
    count: members.length,
  };
}

/**
 * Rectangular gable ends — rise, ridge and barge/rake lengths.
 * Free forever with common rafter / birdsmouth in this build.
 */
export function calculateGableEnds(input: GableEndsInput): GableEndsResult {
  const { radians, degrees } = pitchFromInput(input.pitch);
  const spanMm = clampPositive(input.spanMm);
  const lengthMm = clampPositive(input.lengthMm);
  const bargeOverhangMm = clampPositive(input.bargeOverhangMm);
  const runMm = spanMm / 2;
  const riseMm = runMm * Math.tan(radians);
  const cos = Math.cos(radians);
  const commonSlopeMm = cos === 0 ? 0 : runMm / cos;
  const bargeLengthMm = cos === 0 ? 0 : (runMm + bargeOverhangMm) / cos;

  return {
    pitchDegrees: degrees,
    runMm,
    riseMm,
    commonSlopeMm,
    ridgeLengthMm: lengthMm,
    bargeLengthMm,
    plumbCutDegrees: degrees,
    levelCutDegrees: Math.max(0, 90 - degrees),
    risePer300: risePer300FromPitch(radians),
  };
}

/** Round to whole mm for tape call-outs. */
export function roundMm(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

/** Round to 1 decimal degree for bevel gauges. */
export function roundDeg(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}
