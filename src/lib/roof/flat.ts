import { rafterStations } from "./geometry.ts";
import type { Member, SpacingMm } from "./types.ts";

const STOCK_MM = [2400, 2700, 3000, 3600, 4200, 4800, 5400, 6000, 7200, 8400];

/**
 * Shown on the flat-roof screen. Lengths only — the span table still sizes the stick.
 * Wording is for a carpenter: the span they typed has to be in the table.
 */
export const FLAT_SPAN_TABLE_NOTE =
  "Before you order or cut, the span tables have to allow this rafter span for this member size, these centres and the stress grade. This screen does not check the span table.";

export type FlatRoofInputs = {
  /** Length the rafters are spaced along, millimetres (outside of plates). */
  lengthMm: number;
  /** Rafter span, outside of plate to outside of plate, millimetres. Level — no pitch. */
  spanMm: number;
  /** Eaves past the plate, each side, millimetres. */
  overhangMm: number;
  spacingMm: SpacingMm;
  rafter: Member;
};

export type FlatRoofResult = {
  spanMm: number;
  lengthMm: number;
  overhangEachSideMm: number;
  /** Span plus eaves both sides. No birdsmouth and no pitch. */
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
  spanMm: 3600,
  overhangMm: 450,
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

export function calculateFlatRoof(raw: FlatRoofInputs): FlatRoofResult {
  const lengthMm = Math.max(0, raw.lengthMm);
  const spanMm = Math.max(0, raw.spanMm);
  const overhangMm = Math.max(0, raw.overhangMm);
  const spacingMm = raw.spacingMm;
  const stations = rafterStations(0, lengthMm, spacingMm);
  const previous = stations.length >= 2 ? stations[stations.length - 2] : 0;
  const last = stations.length >= 1 ? stations[stations.length - 1] : 0;
  return {
    spanMm: round1(spanMm),
    lengthMm: round1(lengthMm),
    overhangEachSideMm: round1(overhangMm),
    rafterOverallMm: round1(spanMm + overhangMm * 2),
    rafterCount: stations.length,
    spacingMm,
    lastBayMm: round1(Math.max(0, last - previous)),
    stockMm: stockMm(spanMm + overhangMm * 2),
    spanNote: FLAT_SPAN_TABLE_NOTE,
  };
}
