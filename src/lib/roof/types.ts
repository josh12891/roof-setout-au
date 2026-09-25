export type EndType = "hip" | "gable";
export type SpacingMm = 450 | 600;
export type Junction = "none" | "L" | "T";
export type Covering = "sheet" | "tile";

export type Member = {
  depth: number;
  breadth: number;
};

export type RoofInputs = {
  /** Building length along the ridge, millimetres (outside of plates). */
  lengthMm: number;
  /** Building width / span, millimetres (outside of plates). */
  widthMm: number;
  /** Roof pitch in degrees. */
  pitchDeg: number;
  leftEnd: EndType;
  rightEnd: EndType;
  rafter: Member;
  ridge: Member;
  hip: Member;
  /** Wall plate width the birdsmouth sits on (typically 90). */
  plateWidthMm: number;
  spacingMm: SpacingMm;
  /** Horizontal eaves overhang past the plate, millimetres. */
  overhangMm: number;
  junction: Junction;
  /** Wing span (width) for an intersecting roof, millimetres. */
  wingSpanMm: number;
  /** How far the wing projects from the main wall, millimetres. */
  wingProjectionMm: number;
  /** Outer end of the intersecting roof. */
  wingEnd: EndType;
  covering: Covering;
};

export type Creeper = {
  index: number;
  /** Distance from the hip corner along the plate, mm. */
  fromCornerMm: number;
  /** Length from birdsmouth plumb to hip cheek, mm. */
  toBirdsmouthMm: number;
  /** Overall length including eaves overhang, mm. */
  overallMm: number;
  hand: "left" | "right";
};

export type Bevels = {
  /** Face plumb cut, degrees. */
  plumb: number;
  /** Level / seat cut, degrees. */
  seat: number;
  /** Side / cheek cut of a creeper (jack) measured on the edge, degrees. */
  sideCut: number;
  /** Hip/valley cheek cut on the edge at the ridge, degrees. */
  hipSideCut: number;
  /** Circular-saw blade tilt for a compound cheek, degrees. */
  sawBevel: number;
  /** Hip backing (bevel the top edges into the roof plane), degrees. */
  backing: number;
  /** Hip pitch — the shallower plumb of the hip/valley, degrees. */
  hipPitch: number;
};

export type Birdsmouth = {
  seatMm: number;
  plumbDepthMm: number;
  maxPlumbMm: number;
  remainingDepthMm: number;
  minSeatMm: number;
  limitedByCode: boolean;
  ok: boolean;
  note: string;
};

export type MemberCut = {
  name: string;
  count: number;
  toBirdsmouthMm: number;
  overallMm: number;
  stockMm: number;
  notes: string;
};

export type RoofResult = {
  pitchDeg: number;
  pitchRad: number;
  halfSpanMm: number;
  commonRunMm: number;
  riseMm: number;
  risePerMetreMm: number;
  commonToBirdsmouthMm: number;
  commonOverhangMm: number;
  commonOverallMm: number;
  /** Hypotenuse of the pitch triangle, to the centre of the ridge. Overhang not included. */
  geometricalCommonMm: number;
  /** Geometrical length less half the ridge thickness (square off the plumb). */
  cuttingCommonMm: number;
  hipRunMm: number;
  hipToBirdsmouthMm: number;
  hipOverhangMm: number;
  hipOverallMm: number;
  valleyToBirdsmouthMm: number;
  valleyOverhangMm: number;
  valleyOverallMm: number;
  ridgeLengthMm: number;
  ridgeWithOverhangMm: number;
  ridgeHeightAbovePlateMm: number;
  hipCount: number;
  valleyCount: number;
  commonCount: number;
  vergeCount: number;
  crownEndCount: number;
  centeringCount: number;
  commonDifferenceMm: number;
  hipDeductionMm: number;
  creepers: Creeper[];
  creeperPerHipCorner: number;
  brokenHipCount: number;
  valleyJackCount: number;
  crippleJackCount: number;
  minorRidgeLengthMm: number;
  endJackCuttingMm: number;
  bevels: Bevels;
  birdsmouth: Birdsmouth;
  cuttingList: MemberCut[];
  pyramid: boolean;
  warnings: string[];
};
