/** Pitch as degrees or rise:run (same units on rise and run). */
export type PitchInput =
  | { kind: "degrees"; degrees: number }
  | { kind: "rise-run"; rise: number; run: number };

export type BirdsmouthInput = {
  /** Horizontal seat (level cut) on the plate, mm. */
  seatMm: number;
  /** Rafter depth (actual timber depth), mm. */
  rafterDepthMm: number;
};

export type CommonRafterInput = {
  /** Full building span wall-plate to wall-plate, mm. */
  spanMm: number;
  pitch: PitchInput;
  /** Horizontal overhang past the outer plate face, mm. */
  overhangMm: number;
  birdsmouth: BirdsmouthInput;
};

export type BirdsmouthResult = {
  seatMm: number;
  /** Vertical heel height of the birdsmouth. */
  heelMm: number;
  /** Plumb cut depth of the birdsmouth (along rafter face). */
  plumbMm: number;
  /** Timber left above the birdsmouth (depth − heel). */
  remainingDepthMm: number;
  /** True when heel would exceed rafter depth. */
  overcut: boolean;
};

export type CommonRafterResult = {
  pitchDegrees: number;
  /** Half-span run to ridge centreline, mm. */
  runMm: number;
  riseMm: number;
  /** Slope length plate centreline to ridge, mm. */
  slopeLengthMm: number;
  /** Slope length including overhang past the plate, mm. */
  totalLengthMm: number;
  /** Rise:run expressed as rise per 300 mm run (common AU framing square). */
  risePer300: number;
  plumbCutDegrees: number;
  levelCutDegrees: number;
  birdsmouth: BirdsmouthResult;
};

export type HipValleyKind = "hip" | "valley";

export type HipValleyInput = {
  kind: HipValleyKind;
  /** Common half-span run (same as common rafter run), mm. */
  runMm: number;
  pitch: PitchInput;
  overhangMm: number;
  /** Plan corner angle in degrees (90 for square hip/valley). */
  planCornerDegrees: number;
};

export type HipValleyResult = {
  kind: HipValleyKind;
  pitchDegrees: number;
  commonPitchDegrees: number;
  /** Plan run of the hip/valley (bisected corner), mm. */
  planRunMm: number;
  riseMm: number;
  /** True hip/valley pitch (shallower than common). */
  hipPitchDegrees: number;
  slopeLengthMm: number;
  totalLengthMm: number;
  /** Backing / bevel angle on the top edge, degrees. */
  backingDegrees: number;
  /** Side cut (edge bevel) at the ridge, degrees. */
  sideCutDegrees: number;
  plumbCutDegrees: number;
  levelCutDegrees: number;
};

export type CreeperInput = {
  /** Half-span run of the main roof, mm. */
  runMm: number;
  pitch: PitchInput;
  /** Centres along the wall plate, mm. */
  centresMm: number;
  /** Distance from corner / first creeper offset along plate, mm. */
  firstOffsetMm: number;
  overhangMm: number;
  /** Rafter thickness for hip/valley cheek allowance, mm. */
  hipThicknessMm: number;
};

export type CreeperMember = {
  index: number;
  /** Mark from corner along the wall plate, mm. */
  plateMarkMm: number;
  /** Remaining common run to the hip, mm. */
  remainingRunMm: number;
  slopeLengthMm: number;
  totalLengthMm: number;
};

export type CreeperResult = {
  pitchDegrees: number;
  reductionPerBayMm: number;
  members: CreeperMember[];
  count: number;
};

export type SkillionInput = {
  /** Horizontal run wall to wall (or wall to ridge), mm. */
  runMm: number;
  pitch: PitchInput;
  overhangLowMm: number;
  overhangHighMm: number;
  birdsmouth: BirdsmouthInput;
  /** Optional higher plate / bulkhead rise difference, mm. */
  plateStepMm: number;
};

export type SkillionResult = {
  pitchDegrees: number;
  riseMm: number;
  slopeLengthMm: number;
  totalLengthMm: number;
  lowEndHeightMm: number;
  highEndHeightMm: number;
  plumbCutDegrees: number;
  levelCutDegrees: number;
  birdsmouth: BirdsmouthResult;
};

export type JunctionKind =
  | "equal-hip"
  | "equal-valley"
  | "skillion-to-pitch"
  | "unequal-pitch";

export type JunctionInput = {
  kind: JunctionKind;
  mainPitch: PitchInput;
  secondaryPitch?: PitchInput;
  mainRunMm: number;
  secondaryRunMm?: number;
  planCornerDegrees: number;
};

export type JunctionResult = {
  kind: JunctionKind;
  mainPitchDegrees: number;
  secondaryPitchDegrees: number | null;
  bisectPlanDegrees: number;
  /** Intersection member pitch (hip/valley/mitre), degrees. */
  junctionPitchDegrees: number;
  planRunMm: number;
  slopeLengthFactor: number;
  notes: string[];
};
