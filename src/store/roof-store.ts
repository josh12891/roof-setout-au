import { create } from "zustand";
import { DEFAULT_INPUTS } from "@/lib/roof/geometry";
import type { Covering, EndType, Junction, Member, RoofInputs, SpacingMm } from "@/lib/roof/types";

type RoofState = RoofInputs & {
  setLength: (mm: number) => void;
  setWidth: (mm: number) => void;
  setPitch: (deg: number) => void;
  setLeftEnd: (end: EndType) => void;
  setRightEnd: (end: EndType) => void;
  setRafter: (m: Member) => void;
  setRidge: (m: Member) => void;
  setHip: (m: Member) => void;
  setPlateWidth: (mm: number) => void;
  setSpacing: (mm: SpacingMm) => void;
  setOverhang: (mm: number) => void;
  setJunction: (j: Junction) => void;
  setWingSpan: (mm: number) => void;
  setWingProjection: (mm: number) => void;
  setWingEnd: (end: EndType) => void;
  setCovering: (c: Covering) => void;
  reset: () => void;
};

export const useRoofStore = create<RoofState>()((set) => ({
  ...DEFAULT_INPUTS,
  setLength: (lengthMm) => set({ lengthMm }),
  setWidth: (widthMm) => set({ widthMm }),
  setPitch: (pitchDeg) => set({ pitchDeg }),
  setLeftEnd: (leftEnd) => set({ leftEnd }),
  setRightEnd: (rightEnd) => set({ rightEnd }),
  setRafter: (rafter) => set({ rafter }),
  setRidge: (ridge) => set({ ridge }),
  setHip: (hip) => set({ hip }),
  setPlateWidth: (plateWidthMm) => set({ plateWidthMm }),
  setSpacing: (spacingMm) => set({ spacingMm }),
  setOverhang: (overhangMm) => set({ overhangMm }),
  setJunction: (junction) => set({ junction }),
  setWingSpan: (wingSpanMm) => set({ wingSpanMm }),
  setWingProjection: (wingProjectionMm) => set({ wingProjectionMm }),
  setWingEnd: (wingEnd) => set({ wingEnd }),
  setCovering: (covering) => set({ covering }),
  reset: () => set({ ...DEFAULT_INPUTS }),
}));

export function selectInputs(s: RoofState): RoofInputs {
  return {
    lengthMm: s.lengthMm,
    widthMm: s.widthMm,
    pitchDeg: s.pitchDeg,
    leftEnd: s.leftEnd,
    rightEnd: s.rightEnd,
    rafter: s.rafter,
    ridge: s.ridge,
    hip: s.hip,
    plateWidthMm: s.plateWidthMm,
    spacingMm: s.spacingMm,
    overhangMm: s.overhangMm,
    junction: s.junction,
    wingSpanMm: s.wingSpanMm,
    wingProjectionMm: s.wingProjectionMm,
    wingEnd: s.wingEnd,
    covering: s.covering,
  };
}
