export type {
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
  HipValleyKind,
  HipValleyResult,
  JunctionInput,
  JunctionKind,
  JunctionResult,
  LtPlanShape,
  PitchInput,
} from "./types";

export {
  birdsmouthFromSeat,
  calculateCommonRafter,
  calculateCreepers,
  calculateGableEnds,
  calculateHipValley,
  clampPositive,
  pitchFromInput,
  risePer300FromPitch,
  roundDeg,
  roundMm,
} from "./geometry";

export {
  DEFAULT_KERF_MM,
  DEFAULT_STOCK_LENGTHS_MM,
  buildCuttingLines,
  pickStockLength,
  rollupMaterialOrder,
  summarizeMaterialOrder,
} from "./materials";
export type { CuttingLine, MaterialOrderLine, MaterialOrderSummary } from "./materials";

export { calculateJunction } from "./junction";
