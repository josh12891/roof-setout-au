import { pitchFromInput } from "./geometry";
import type { JunctionInput, JunctionResult } from "./types";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/**
 * Advanced roof junctions — equal hip/valley, skillion into a pitched roof,
 * and unequal-pitch mitres. Pure geometry for set-out; not a structural design.
 */
export function calculateJunction(input: JunctionInput): JunctionResult {
  const main = pitchFromInput(input.mainPitch);
  const secondary = input.secondaryPitch
    ? pitchFromInput(input.secondaryPitch)
    : null;
  const corner = Number.isFinite(input.planCornerDegrees)
    ? input.planCornerDegrees
    : 90;
  const halfCornerRad = (Math.max(0, corner) / 2) * DEG;
  const mainRun = Math.max(0, input.mainRunMm);
  const secondaryRun = Math.max(0, input.secondaryRunMm ?? mainRun);

  switch (input.kind) {
    case "equal-hip":
    case "equal-valley": {
      const sinHalf = Math.sin(halfCornerRad);
      const planRunMm = sinHalf === 0 ? 0 : mainRun / sinHalf;
      const riseMm = mainRun * Math.tan(main.radians);
      const junctionRad = planRunMm === 0 ? 0 : Math.atan(riseMm / planRunMm);
      const factor = mainRun === 0 ? 0 : planRunMm / Math.cos(junctionRad) / mainRun;
      return {
        kind: input.kind,
        mainPitchDegrees: main.degrees,
        secondaryPitchDegrees: main.degrees,
        bisectPlanDegrees: corner / 2,
        junctionPitchDegrees: junctionRad * RAD,
        planRunMm,
        slopeLengthFactor: factor,
        notes: [
          input.kind === "equal-hip"
            ? "Equal-pitch hip — plan bisects the external corner."
            : "Equal-pitch valley — plan bisects the internal corner.",
          "Slope length ≈ half-span × factor (see slopeLengthFactor).",
        ],
      };
    }
    case "skillion-to-pitch": {
      const sec = secondary ?? main;
      // Mitre on plan for skillion meeting a pitched plane along a wall/ridge line.
      const delta = Math.abs(main.radians - sec.radians);
      const junctionRad = Math.atan(
        Math.sin(delta) / (Math.cos(delta) + Math.cos(halfCornerRad) || 1),
      );
      const planRunMm = mainRun;
      return {
        kind: input.kind,
        mainPitchDegrees: main.degrees,
        secondaryPitchDegrees: sec.degrees,
        bisectPlanDegrees: corner / 2,
        junctionPitchDegrees: junctionRad * RAD,
        planRunMm,
        slopeLengthFactor: Math.cos(junctionRad) === 0 ? 0 : 1 / Math.cos(junctionRad),
        notes: [
          "Skillion into pitched roof — confirm which plane carries the mitre on site.",
          "Use junction pitch for the intersecting member plumb/level cuts.",
        ],
      };
    }
    case "unequal-pitch": {
      const sec = secondary ?? main;
      const riseMain = mainRun * Math.tan(main.radians);
      const riseSec = secondaryRun * Math.tan(sec.radians);
      // Place the plan hip so both sides reach the same ridge height.
      // Plan angle from the main side: atan((riseMain/riseSec) related runs).
      const planFromMainRad =
        riseMain + riseSec === 0
          ? halfCornerRad
          : Math.atan2(riseSec * Math.sin(corner * DEG), riseMain + riseSec * Math.cos(corner * DEG));
      const planRunMm =
        Math.sin(planFromMainRad) === 0 ? mainRun : mainRun / Math.sin(planFromMainRad);
      const junctionRad = planRunMm === 0 ? 0 : Math.atan(riseMain / planRunMm);
      return {
        kind: input.kind,
        mainPitchDegrees: main.degrees,
        secondaryPitchDegrees: sec.degrees,
        bisectPlanDegrees: planFromMainRad * RAD,
        junctionPitchDegrees: junctionRad * RAD,
        planRunMm,
        slopeLengthFactor:
          mainRun === 0 || Math.cos(junctionRad) === 0
            ? 0
            : planRunMm / Math.cos(junctionRad) / mainRun,
        notes: [
          "Unequal pitches — plan hip is not a 45° bisector.",
          `Plan angle from main side ≈ ${(planFromMainRad * RAD).toFixed(1)}°.`,
        ],
      };
    }
    default: {
      const _exhaustive: never = input.kind;
      return _exhaustive;
    }
  }
}
