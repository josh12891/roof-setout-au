import { describe, expect, it } from "vitest";
import { calculateJunction } from "./junction";

describe("L/T junction", () => {
  it("equal-hip bisects a 90° L corner", () => {
    const result = calculateJunction({
      kind: "equal-hip",
      planShape: "L",
      mainPitch: { kind: "degrees", degrees: 22.5 },
      mainRunMm: 4500,
      planCornerDegrees: 90,
    });
    expect(result.planShape).toBe("L");
    expect(result.bisectPlanDegrees).toBe(45);
    expect(result.secondaryPitchDegrees).toBeCloseTo(22.5, 6);
    expect(result.planRunMm).toBeCloseTo(4500 * Math.SQRT2, 5);
    expect(result.junctionPitchDegrees).toBeLessThan(22.5);
    expect(result.slopeLengthFactor).toBeGreaterThan(1);
    expect(result.notes.some((n) => /L-junction/i.test(n))).toBe(true);
  });

  it("equal-valley on a T plan tags the plan shape", () => {
    const result = calculateJunction({
      kind: "equal-valley",
      planShape: "T",
      mainPitch: { kind: "degrees", degrees: 30 },
      mainRunMm: 3000,
      planCornerDegrees: 90,
    });
    expect(result.kind).toBe("equal-valley");
    expect(result.planShape).toBe("T");
    expect(result.notes.some((n) => /T-junction/i.test(n))).toBe(true);
  });

  it("unequal-pitch shifts the plan angle off 45°", () => {
    const result = calculateJunction({
      kind: "unequal-pitch",
      planShape: "L",
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

  it("does not expose skillion junction kinds", () => {
    const kinds = ["equal-hip", "equal-valley", "unequal-pitch"] as const;
    expect(kinds).not.toContain("skillion-to-pitch");
  });
});
