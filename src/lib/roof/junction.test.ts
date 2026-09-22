import { describe, expect, it } from "vitest";
import { calculateJunction } from "./junction";

describe("junction", () => {
  it("equal-hip bisects a 90° corner", () => {
    const result = calculateJunction({
      kind: "equal-hip",
      mainPitch: { kind: "degrees", degrees: 22.5 },
      mainRunMm: 4500,
      planCornerDegrees: 90,
    });
    expect(result.bisectPlanDegrees).toBe(45);
    expect(result.secondaryPitchDegrees).toBeCloseTo(22.5, 6);
    expect(result.planRunMm).toBeCloseTo(4500 * Math.SQRT2, 5);
    expect(result.junctionPitchDegrees).toBeLessThan(22.5);
    expect(result.slopeLengthFactor).toBeGreaterThan(1);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it("equal-valley mirrors equal-hip geometry", () => {
    const hip = calculateJunction({
      kind: "equal-hip",
      mainPitch: { kind: "degrees", degrees: 30 },
      mainRunMm: 3000,
      planCornerDegrees: 90,
    });
    const valley = calculateJunction({
      kind: "equal-valley",
      mainPitch: { kind: "degrees", degrees: 30 },
      mainRunMm: 3000,
      planCornerDegrees: 90,
    });
    expect(valley.kind).toBe("equal-valley");
    expect(valley.planRunMm).toBeCloseTo(hip.planRunMm, 8);
    expect(valley.junctionPitchDegrees).toBeCloseTo(hip.junctionPitchDegrees, 8);
  });

  it("skillion-to-pitch reports both pitches", () => {
    const result = calculateJunction({
      kind: "skillion-to-pitch",
      mainPitch: { kind: "degrees", degrees: 10 },
      secondaryPitch: { kind: "degrees", degrees: 25 },
      mainRunMm: 4000,
      planCornerDegrees: 90,
    });
    expect(result.mainPitchDegrees).toBeCloseTo(10, 6);
    expect(result.secondaryPitchDegrees).toBeCloseTo(25, 6);
    expect(result.junctionPitchDegrees).toBeGreaterThan(0);
  });

  it("unequal-pitch shifts the plan angle off 45°", () => {
    const result = calculateJunction({
      kind: "unequal-pitch",
      mainPitch: { kind: "degrees", degrees: 22.5 },
      secondaryPitch: { kind: "degrees", degrees: 35 },
      mainRunMm: 4500,
      secondaryRunMm: 4500,
      planCornerDegrees: 90,
    });
    expect(result.bisectPlanDegrees).not.toBeCloseTo(45, 0);
    expect(result.secondaryPitchDegrees).toBeCloseTo(35, 6);
    expect(result.planRunMm).toBeGreaterThan(4500);
  });
});
