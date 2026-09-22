import { pitchFromInput } from "./geometry";
import type { JunctionInput, JunctionResult } from "./types";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/**
 * L / T roof plan junctions — equal hip/valley or unequal-pitch mitres.
 * Skillion is not part of this build.
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
  const planShape = input.planShape;
  const shapeNote =
    planShape === "T"
      ? "T-junction — wing meets the main run; check both valleys / hips on site."
      : "L-junction — external hip or internal valley at the plan corner.";

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
        planShape,
        mainPitchDegrees: main.degrees,
        secondaryPitchDegrees: main.degrees,
        bisectPlanDegrees: corner / 2,
        junctionPitchDegrees: junctionRad * RAD,
        planRunMm,
        slopeLengthFactor: factor,
        notes: [
          shapeNote,
          input.kind === "equal-hip"
            ? "Equal-pitch hip — plan bisects the external corner."
            : "Equal-pitch valley — plan bisects the internal corner.",
          "Slope length ≈ half-span × factor (see slopeLengthFactor).",
        ],
      };
    }
    case "unequal-pitch": {
      const sec = secondary ?? main;
      const riseMain = mainRun * Math.tan(main.radians);
      const riseSec = secondaryRun * Math.tan(sec.radians);
      const planFromMainRad =
        riseMain + riseSec === 0
          ? halfCornerRad
          : Math.atan2(
              riseSec * Math.sin(corner * DEG),
              riseMain + riseSec * Math.cos(corner * DEG),
            );
      const planRunMm =
        Math.sin(planFromMainRad) === 0 ? mainRun : mainRun / Math.sin(planFromMainRad);
      const junctionRad = planRunMm === 0 ? 0 : Math.atan(riseMain / planRunMm);
      return {
        kind: input.kind,
        planShape,
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
          shapeNote,
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
