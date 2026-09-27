import { rafterStations } from "./geometry.ts";
import type { Member, SpacingMm } from "./types.ts";

const STOCK_MM = [2400, 2700, 3000, 3600, 4200, 4800, 5400, 6000, 7200, 8400];
const DEG = Math.PI / 180;
/** A single plane can be level. Steeper than this is clamped so the stick length stays finite. */
const PITCH_MAX_DEG = 60;

/**
 * Shown on the flat-roof screen. Lengths only — the span table still sizes the stick.
 * The span is the plan width between the plates. Pitch changes the stick length.
 */
export const FLAT_SPAN_TABLE_NOTE =
  "Before you order or cut, the span tables have to allow this rafter span for this member size, these centres and the stress grade. On this single plane the span is the plan width between the plates. Pitch sets the rafter length, not the span. This screen does not check the span table.";

export type FlatRoofInputs = {
  /** Building length, millimetres. Rafters are spaced along this. */
  lengthMm: number;
  /** Building width, millimetres. Plan span, outside of plate to outside of plate. Rafters run this way. */
  widthMm: number;
  /** Eaves past the plate, each side, horizontal millimetres. */
  overhangMm: number;
  /**
   * Pitch of the one roof plane, degrees.
   * 0 is level. This is still one plane — no ridge, hips, valleys or wings.
   */
  pitchDeg: number;
  spacingMm: SpacingMm;
  rafter: Member;
};

export type FlatRoofResult = {
  /** Horizontal span between plates. This is the number a span table uses. */
  spanMm: number;
  widthMm: number;
  lengthMm: number;
  pitchDeg: number;
  overhangEachSideMm: number;
  /** Width plus eaves both sides, measured on the plan. */
  planRunMm: number;
  /** Rise of the plane over the width between the plates. */
  riseMm: number;
  /** Sloping stick length: plan run ÷ cos(pitch). Calculated — not typed. */
  rafterOverallMm: number;
  rafterCount: number;
  spacingMm: number;
  /** Distance from the last full centre to the far plate. Full spacing when it lands on centre. */
  lastBayMm: number;
  stockMm: number;
  spanNote: string;
};

export const DEFAULT_FLAT_INPUTS: FlatRoofInputs = {
  lengthMm: 8000,
  widthMm: 3600,
  overhangMm: 450,
  pitchDeg: 0,
  spacingMm: 600,
  rafter: { depth: 190, breadth: 45 },
};

function stockMm(lengthMm: number): number {
  const withWaste = lengthMm + 50;
  for (const s of STOCK_MM) {
    if (s >= withWaste) return s;
  }
  return Math.ceil(withWaste / 300) * 300;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function clampFlatPitchDeg(pitchDeg: number): number {
  if (!Number.isFinite(pitchDeg)) return 0;
  return Math.min(PITCH_MAX_DEG, Math.max(0, pitchDeg));
}

/**
 * Rafter length from the plan.
 * The plan run is the width plus eaves each side. Pitch tilts that run into the slope.
 */
export function flatRafterLengthMm(widthMm: number, overhangMm: number, pitchDeg: number): number {
  const planRunMm = Math.max(0, widthMm) + Math.max(0, overhangMm) * 2;
  const pitchRad = clampFlatPitchDeg(pitchDeg) * DEG;
  const cos = Math.cos(pitchRad);
  if (cos < 1e-6) return planRunMm;
  return planRunMm / cos;
}

export function calculateFlatRoof(raw: FlatRoofInputs): FlatRoofResult {
  const lengthMm = Math.max(0, raw.lengthMm);
  const widthMm = Math.max(0, raw.widthMm);
  const overhangMm = Math.max(0, raw.overhangMm);
  const pitchDeg = clampFlatPitchDeg(raw.pitchDeg);
  const pitchRad = pitchDeg * DEG;
  const spacingMm = raw.spacingMm;
  const stations = rafterStations(0, lengthMm, spacingMm);
  const previous = stations.length >= 2 ? stations[stations.length - 2] : 0;
  const last = stations.length >= 1 ? stations[stations.length - 1] : 0;
  const planRunMm = widthMm + overhangMm * 2;
  const rafterOverallMm = flatRafterLengthMm(widthMm, overhangMm, pitchDeg);
  return {
    spanMm: round1(widthMm),
    widthMm: round1(widthMm),
    lengthMm: round1(lengthMm),
    pitchDeg: round1(pitchDeg),
    overhangEachSideMm: round1(overhangMm),
    planRunMm: round1(planRunMm),
    riseMm: round1(widthMm * Math.tan(pitchRad)),
    rafterOverallMm: round1(rafterOverallMm),
    rafterCount: stations.length,
    spacingMm,
    lastBayMm: round1(Math.max(0, last - previous)),
    stockMm: stockMm(rafterOverallMm),
    spanNote: FLAT_SPAN_TABLE_NOTE,
  };
}
