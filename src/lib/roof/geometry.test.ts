import { describe, expect, it } from "vitest";
import {
  birdsmouthFromSeat,
  calculateCommonRafter,
  calculateCreepers,
  calculateGableEnds,
  calculateHipValley,
  pitchFromInput,
  risePer300FromPitch,
  roundMm,
} from "./geometry";

describe("pitchFromInput", () => {
  it("accepts degrees", () => {
    const p = pitchFromInput({ kind: "degrees", degrees: 22.5 });
    expect(p.degrees).toBeCloseTo(22.5, 6);
    expect(p.radians).toBeCloseTo((22.5 * Math.PI) / 180, 6);
  });

  it("accepts rise:run", () => {
    const p = pitchFromInput({ kind: "rise-run", rise: 1, run: 2 });
    expect(p.degrees).toBeCloseTo((Math.atan(0.5) * 180) / Math.PI, 6);
  });

  it("handles zero run without throwing", () => {
    expect(pitchFromInput({ kind: "rise-run", rise: 1, run: 0 }).degrees).toBe(0);
  });
});

describe("common rafter + birdsmouth", () => {
  it("matches a 9000 mm span at 22.5°", () => {
    const result = calculateCommonRafter({
      spanMm: 9000,
      pitch: { kind: "degrees", degrees: 22.5 },
      overhangMm: 600,
      birdsmouth: { seatMm: 90, rafterDepthMm: 190 },
    });

    expect(result.runMm).toBe(4500);
    expect(result.riseMm).toBeCloseTo(4500 * Math.tan((22.5 * Math.PI) / 180), 5);
    expect(result.slopeLengthMm).toBeCloseTo(4500 / Math.cos((22.5 * Math.PI) / 180), 5);
    expect(result.totalLengthMm).toBeCloseTo(5100 / Math.cos((22.5 * Math.PI) / 180), 5);
    expect(result.plumbCutDegrees).toBeCloseTo(22.5, 6);
    expect(result.levelCutDegrees).toBeCloseTo(67.5, 6);
    expect(result.risePer300).toBeCloseTo(risePer300FromPitch(result.pitchDegrees * (Math.PI / 180)), 5);
    expect(result.birdsmouth.seatMm).toBe(90);
    expect(result.birdsmouth.heelMm).toBeCloseTo(90 * Math.tan((22.5 * Math.PI) / 180), 5);
    expect(result.birdsmouth.overcut).toBe(false);
    expect(result.birdsmouth.remainingDepthMm).toBeGreaterThan(0);
  });

  it("flags birdsmouth overcut when heel exceeds depth", () => {
    const bm = birdsmouthFromSeat(Math.PI / 4, { seatMm: 200, rafterDepthMm: 90 });
    expect(bm.overcut).toBe(true);
    expect(bm.remainingDepthMm).toBeLessThan(0);
  });

  it("rounds tape call-outs to whole mm", () => {
    expect(roundMm(1234.4)).toBe(1234);
    expect(roundMm(1234.6)).toBe(1235);
  });
});

describe("hip / valley", () => {
  it("uses √2 plan run on a square equal-pitch hip", () => {
    const runMm = 4500;
    const result = calculateHipValley({
      kind: "hip",
      runMm,
      pitch: { kind: "degrees", degrees: 22.5 },
      overhangMm: 600,
      planCornerDegrees: 90,
    });

    expect(result.planRunMm).toBeCloseTo(runMm * Math.SQRT2, 5);
    const rise = runMm * Math.tan((22.5 * Math.PI) / 180);
    expect(result.riseMm).toBeCloseTo(rise, 5);
    expect(result.hipPitchDegrees).toBeLessThan(22.5);
    expect(result.slopeLengthMm).toBeCloseTo(
      Math.sqrt(result.planRunMm ** 2 + rise ** 2),
      4,
    );
    expect(result.backingDegrees).toBeGreaterThan(0);
    expect(result.sideCutDegrees).toBeGreaterThan(0);
  });

  it("marks valley the same geometrically with kind tag", () => {
    const hip = calculateHipValley({
      kind: "hip",
      runMm: 4000,
      pitch: { kind: "degrees", degrees: 25 },
      overhangMm: 0,
      planCornerDegrees: 90,
    });
    const valley = calculateHipValley({
      kind: "valley",
      runMm: 4000,
      pitch: { kind: "degrees", degrees: 25 },
      overhangMm: 0,
      planCornerDegrees: 90,
    });
    expect(valley.kind).toBe("valley");
    expect(valley.slopeLengthMm).toBeCloseTo(hip.slopeLengthMm, 8);
  });
});

describe("creepers", () => {
  it("reduces remaining run by centres along the plate", () => {
    const result = calculateCreepers({
      runMm: 4500,
      pitch: { kind: "degrees", degrees: 22.5 },
      centresMm: 600,
      firstOffsetMm: 600,
      overhangMm: 450,
      hipThicknessMm: 45,
    });

    expect(result.count).toBeGreaterThan(3);
    expect(result.members[0]?.plateMarkMm).toBe(600);
    expect(result.members[0]?.remainingRunMm).toBeCloseTo(4500 - 600 - 22.5, 5);
    expect(result.members[1]?.plateMarkMm).toBe(1200);
    // Each bay shortens the slope length by centres / cos(pitch).
    const cos = Math.cos((22.5 * Math.PI) / 180);
    expect(result.reductionPerBayMm).toBeCloseTo(600 / cos, 5);
    expect(result.commonDifferenceMm).toBeCloseTo(600 / cos, 5);
    const delta =
      (result.members[0]?.slopeLengthMm ?? 0) - (result.members[1]?.slopeLengthMm ?? 0);
    expect(delta).toBeCloseTo(600 / cos, 4);
    expect(delta).toBeCloseTo(result.commonDifferenceMm, 4);
  });

  it("returns no members when centres are zero", () => {
    const result = calculateCreepers({
      runMm: 4000,
      pitch: { kind: "degrees", degrees: 20 },
      centresMm: 0,
      firstOffsetMm: 0,
      overhangMm: 0,
      hipThicknessMm: 0,
    });
    expect(result.count).toBe(0);
  });
});

describe("gable ends", () => {
  it("returns rise, ridge and barge lengths for a rectangular gable", () => {
    const result = calculateGableEnds({
      spanMm: 9000,
      lengthMm: 12000,
      pitch: { kind: "degrees", degrees: 22.5 },
      bargeOverhangMm: 450,
    });
    const cos = Math.cos((22.5 * Math.PI) / 180);
    expect(result.runMm).toBe(4500);
    expect(result.ridgeLengthMm).toBe(12000);
    expect(result.commonSlopeMm).toBeCloseTo(4500 / cos, 5);
    expect(result.bargeLengthMm).toBeCloseTo(4950 / cos, 5);
    expect(result.plumbCutDegrees).toBeCloseTo(22.5, 6);
  });
});
