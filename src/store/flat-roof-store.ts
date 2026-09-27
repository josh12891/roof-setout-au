import { create } from "zustand";
import { DEFAULT_FLAT_INPUTS, type FlatRoofInputs } from "@/lib/roof/flat";
import type { Member, SpacingMm } from "@/lib/roof/types";

type FlatState = FlatRoofInputs & {
  setLength: (mm: number) => void;
  setWidth: (mm: number) => void;
  setOverhang: (mm: number) => void;
  setPitch: (deg: number) => void;
  setSpacing: (mm: SpacingMm) => void;
  setRafter: (m: Member) => void;
  reset: () => void;
};

export const useFlatRoofStore = create<FlatState>()((set) => ({
  ...DEFAULT_FLAT_INPUTS,
  setLength: (lengthMm) => set({ lengthMm }),
  setWidth: (widthMm) => set({ widthMm }),
  setOverhang: (overhangMm) => set({ overhangMm }),
  setPitch: (pitchDeg) => set({ pitchDeg }),
  setSpacing: (spacingMm) => set({ spacingMm }),
  setRafter: (rafter) => set({ rafter }),
  reset: () => set({ ...DEFAULT_FLAT_INPUTS }),
}));

export function selectFlatInputs(s: FlatState): FlatRoofInputs {
  return {
    lengthMm: s.lengthMm,
    widthMm: s.widthMm,
    overhangMm: s.overhangMm,
    pitchDeg: s.pitchDeg,
    spacingMm: s.spacingMm,
    rafter: s.rafter,
  };
}
