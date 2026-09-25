export type {
  Bevels,
  Birdsmouth,
  Covering,
  Creeper,
  EndType,
  Junction,
  Member,
  MemberCut,
  RoofInputs,
  RoofResult,
  SpacingMm,
} from "./types";

export { calculateRoof, DEFAULT_INPUTS, MEMBER_PRESETS, PITCH_PRESETS } from "./geometry";

export { junctionLayout, stationsFromCorner, valleyXAtY, valleyYsAtX } from "./junction";
export type { JunctionLayout, MemberSeg, PlanDim, RafterKind, Seg } from "./junction";
