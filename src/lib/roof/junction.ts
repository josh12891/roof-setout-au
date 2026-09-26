import type { RoofInputs } from "./types";

export type Seg = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
};

export type RafterKind = "common" | "jack" | "centering" | "crown" | "valley-jack" | "cripple";

export type MemberSeg = Seg & {
  kind: RafterKind;
  /** Plan run along the member, millimetres. */
  planMm: number;
  /** 1-based jack index from the hip/valley corner, when kind is jack / valley-jack. */
  index?: number;
  tag?: string;
};

export type PlanDim = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  valueMm: number;
};

export type JunctionLayout = {
  kind: "none" | "L" | "T";
  /** Wing plate rectangle in plan (may sit at x < 0). */
  wing: { x: number; y: number; w: number; h: number };
  internal: { x: number; y: number }[];
  valleys: Seg[];
  brokenHips: Seg[];
  minorRidge: Seg | null;
  minorHips: Seg[];
  /** All wing / valley / cripple rafters — already pointing the right way. */
  members: MemberSeg[];
  labels: { x: number; y: number; text: string; size?: number }[];
  dims: PlanDim[];
  equalSpan: boolean;
  minorHalf: number;
  majorHalf: number;
  junctionPts: { x: number; y: number }[];
  /** Outer end of the wing. */
  wingOuterX: number;
  /** False when the offset is a gable. */
  wingHipped: boolean;
  y0: number;
  y1: number;
  cy: number;
  /** True when the L-wing is flush with the y = 0 end — that corner is not a hip. */
  flushNearEnd: boolean;
};

/** Distances from a hip corner inward, stopping short of the end jack / ridge. */
export function stationsFromCorner(spanToEndJack: number, spacing: number): number[] {
  const out: number[] = [];
  for (let d = spacing; d < spanToEndJack - 8; d += spacing) out.push(d);
  return out;
}

function addMember(
  out: MemberSeg[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  kind: RafterKind,
  extra?: { index?: number; tag?: string; label?: string },
): void {
  const planMm = Math.hypot(x2 - x1, y2 - y1);
  if (planMm < 50) return;
  out.push({ x1, y1, x2, y2, kind, planMm, ...extra });
}

/** Valley x at a given y, or null if that y misses the segment. */
export function valleyXAtY(valleys: Seg[], y: number): number | null {
  for (const v of valleys) {
    const lo = Math.min(v.y1, v.y2);
    const hi = Math.max(v.y1, v.y2);
    if (y < lo - 1 || y > hi + 1) continue;
    const dy = v.y2 - v.y1;
    if (Math.abs(dy) < 1) continue;
    const t = (y - v.y1) / dy;
    if (t < -0.02 || t > 1.02) continue;
    return v.x1 + (v.x2 - v.x1) * t;
  }
  return null;
}

/** All valley y-values at a given x (one per valley that crosses it). */
export function valleyYsAtX(valleys: Seg[], x: number): number[] {
  const ys: number[] = [];
  for (const v of valleys) {
    const lo = Math.min(v.x1, v.x2);
    const hi = Math.max(v.x1, v.x2);
    if (x < lo - 1 || x > hi + 1) continue;
    const dx = v.x2 - v.x1;
    if (Math.abs(dx) < 1) continue;
    const t = (x - v.x1) / dx;
    if (t < -0.02 || t > 1.02) continue;
    ys.push(v.y1 + (v.y2 - v.y1) * t);
  }
  return ys;
}

/**
 * L/T intersecting roof in plan.
 *
 * Main ridge runs along length (y). Wing ridge runs along the offset (x).
 * Commons on the wing therefore run in y (square off the minor ridge).
 * Commons on the major run in x (square off the major ridge).
 * Hip jacks at the wing's outer end run square off each plate, same as a
 * regular hip end rotated 90°.
 */
export function junctionLayout(inputs: RoofInputs): JunctionLayout | null {
  if (inputs.junction === "none") return null;
  const W = inputs.widthMm;
  const L = inputs.lengthMm;
  const S = Math.max(1200, Math.min(inputs.wingSpanMm, L * 0.95));
  const P = Math.max(1200, inputs.wingProjectionMm);
  const majorHalf = W / 2;
  const minorHalf = S / 2;
  const spacing = inputs.spacingMm;
  const equalSpan = Math.abs(S - W) < 40;
  const O = inputs.overhangMm;

  const y0 = inputs.junction === "L" ? 0 : Math.max(0, (L - S) / 2);
  const y1 = y0 + S;
  const wing = { x: -P, y: y0, w: P, h: S };
  const wingOuterX = -P;
  const cy = (y0 + y1) / 2;
  const flushNearEnd = inputs.junction === "L" && y0 < 4;
  const wingHipped = inputs.wingEnd !== "gable";
  const leftHip = inputs.leftEnd === "hip";
  const rightHip = inputs.rightEnd === "hip";

  const internal =
    inputs.junction === "L"
      ? [{ x: 0, y: y1 }]
      : [
          { x: 0, y: y0 },
          { x: 0, y: y1 },
        ];

  const valleys: Seg[] = [];
  const junctionPts: { x: number; y: number }[] = [];
  const brokenHips: Seg[] = [];
  const members: MemberSeg[] = [];
  const labels: JunctionLayout["labels"] = [];

  for (const c of internal) {
    const towardMid = c.y > cy ? -1 : 1;
    const t = Math.min(minorHalf, majorHalf);
    const j = { x: t, y: c.y + towardMid * t };
    junctionPts.push(j);
    valleys.push({ x1: c.x, y1: c.y, x2: j.x, y2: j.y, label: "Valley" });
    labels.push({
      x: (c.x + j.x) / 2 + (towardMid > 0 ? 140 : -420),
      y: (c.y + j.y) / 2 + towardMid * 180,
      text: "Valley",
    });
  }

  const hipInset = wingHipped ? minorHalf : 0;
  const minorRidgeStartX = wingOuterX + hipInset;
  const jMeetX = equalSpan ? majorHalf : Math.min(minorHalf, junctionPts[0]?.x ?? minorHalf);
  const minorRidgeEndX = Math.max(minorRidgeStartX + 40, jMeetX);
  const minorRidge: Seg | null =
    minorRidgeEndX - minorRidgeStartX > 40
      ? { x1: minorRidgeStartX, y1: cy, x2: minorRidgeEndX, y2: cy, label: "Minor ridge" }
      : null;

  const minorHips: Seg[] = wingHipped
    ? [
        { x1: wingOuterX, y1: y0, x2: minorRidgeStartX, y2: cy, label: "Hip" },
        { x1: wingOuterX, y1: y1, x2: minorRidgeStartX, y2: cy, label: "Hip" },
      ]
    : [];

  // ---- Wing rafters ----
  let firstJackLabeled = false;
  let secondJackLabeled = false;
  let commonLabeled = false;
  let valleyJackLabeled = false;

  if (wingHipped) {
    // Hip jacks from each external corner, at centres, toward the end jack.
    // 45° hip → a jack at `d` from the corner meets the hip at `d` and stops.
    for (const d of stationsFromCorner(hipInset, spacing)) {
      const x = wingOuterX + d;
      const idx = Math.max(1, Math.round(d / spacing));
      const tag =
        idx === 1 && !firstJackLabeled ? "1st-jack" : idx === 2 && !secondJackLabeled ? "2nd-jack" : undefined;
      if (tag === "1st-jack") firstJackLabeled = true;
      if (tag === "2nd-jack") secondJackLabeled = true;
      addMember(members, x, y0, x, y0 + d, "jack", { index: idx, tag });
      addMember(members, x, y1, x, y1 - d, "jack", { index: idx });
    }
    for (const d of stationsFromCorner(minorHalf, spacing)) {
      const idx = Math.max(1, Math.round(d / spacing));
      addMember(members, wingOuterX, y0 + d, wingOuterX + d, y0 + d, "jack", { index: idx });
      addMember(members, wingOuterX, y1 - d, wingOuterX + d, y1 - d, "jack", { index: idx });
    }
    addMember(members, minorRidgeStartX, y0, minorRidgeStartX, cy, "centering", { tag: "centering" });
    addMember(members, minorRidgeStartX, y1, minorRidgeStartX, cy, "centering");
    addMember(members, wingOuterX, cy, minorRidgeStartX, cy, "crown", { tag: "end-jack" });
  } else {
    // Gable outer end — ridge runs to the wall, verge pair on the gable.
    addMember(members, wingOuterX, y0, wingOuterX, cy, "common", { tag: "common-wing" });
    addMember(members, wingOuterX, y1, wingOuterX, cy, "common");
    commonLabeled = true;
  }

  // Commons along the minor ridge. On the projection they run to both plates.
  // Over the main: a valley side is already filled by valley jacks; the L flush
  // side has no valley, so those members stay full commons (square off the ridge
  // to the flush wall).
  const valleyAtY0 = internal.some((c) => Math.abs(c.y - y0) < 4);
  const valleyAtY1 = internal.some((c) => Math.abs(c.y - y1) < 4);
  const xCommonsEnd = Math.min(minorRidgeEndX, majorHalf) - 8;
  for (let x = minorRidgeStartX + spacing; x < xCommonsEnd; x += spacing) {
    const overMain = x >= -8;
    const tag = !commonLabeled ? "common-wing" : undefined;
    if (!overMain || !valleyAtY0) {
      addMember(members, x, y0, x, cy, "common", { tag });
      if (tag === "common-wing") commonLabeled = true;
    }
    if (!overMain || !valleyAtY1) {
      addMember(members, x, y1, x, cy, "common");
    }
  }

  // Valley jacks from each internal corner, at centres.
  // Major-side jacks that fall inside a hip triangle stop on the hip (cripple),
  // they must not run through to the ridge.
  for (const c of internal) {
    const towardMid = c.y > cy ? -1 : 1;
    const t = Math.min(minorHalf, majorHalf);
    for (const d of stationsFromCorner(t, spacing)) {
      const y = c.y + towardMid * d;
      const vx = d; // 45° valley from the wall at x = 0
      let xFrom = majorHalf;
      let kind: RafterKind = "valley-jack";
      if (leftHip && y < majorHalf - 4) {
        xFrom = y;
        kind = "cripple";
      } else if (rightHip && y > L - majorHalf + 4) {
        xFrom = L - y;
        kind = "cripple";
      }
      if (xFrom - vx >= 50) {
        addMember(members, xFrom, y, vx, y, kind, kind === "cripple" && !valleyJackLabeled ? { tag: "cripple" } : undefined);
      }
      if (vx >= 8) {
        addMember(members, vx, cy, vx, y, "valley-jack", {
          tag: !valleyJackLabeled ? "valley-jack" : undefined,
        });
        valleyJackLabeled = true;
      }
    }
  }

  if (!equalSpan && junctionPts[0]) {
    const j0 = junctionPts[0];
    const toward = j0.y < cy ? 1 : -1;
    const br: Seg = {
      x1: j0.x,
      y1: j0.y,
      x2: majorHalf,
      y2: j0.y + (majorHalf - j0.x) * toward,
      label: "Broken hip",
    };
    br.x2 = majorHalf;
    br.y2 = Math.max(majorHalf * 0.15, Math.min(L - majorHalf * 0.15, br.y2));
    brokenHips.push(br);
    labels.push({
      x: (br.x1 + br.x2) / 2,
      y: (br.y1 + br.y2) / 2 - 160,
      text: "Broken hip",
    });
    const n = Math.max(1, Math.floor(Math.abs(br.y2 - j0.y) / spacing) - 1);
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      const y = j0.y + (br.y2 - j0.y) * t;
      const vx = valleyXAtY(valleys, y);
      const xV = vx ?? j0.x + (y - j0.y) * ((j0.x - 0) / ((j0.y - internal[0].y) || 1));
      const xH = br.x1 + (br.x2 - br.x1) * t;
      addMember(members, xV, y, xH, y, "cripple", i === 1 ? { tag: "cripple" } : undefined);
    }
    if (junctionPts[1]) {
      const j1 = junctionPts[1];
      const br2: Seg = {
        x1: j1.x,
        y1: j1.y,
        x2: majorHalf,
        y2: j1.y,
        label: "Broken hip",
      };
      br2.y2 = j1.y + (j0.y < cy ? -1 : 1) * 0;
      // Mirror of first broken hip for the second T valley.
      br2.y2 = j1.y + (j1.y > cy ? -1 : 1) * (majorHalf - j1.x);
      br2.y2 = Math.max(majorHalf * 0.15, Math.min(L - majorHalf * 0.15, br2.y2));
      brokenHips.push(br2);
      const n2 = Math.max(1, Math.floor(Math.abs(br2.y2 - j1.y) / spacing) - 1);
      for (let i = 1; i <= n2; i++) {
        const t = i / (n2 + 1);
        const y = j1.y + (br2.y2 - j1.y) * t;
        const vx = valleyXAtY(valleys, y);
        const xV = vx ?? j1.x;
        const xH = br2.x1 + (br2.x2 - br2.x1) * t;
        addMember(members, xV, y, xH, y, "cripple");
      }
    }
  }

  const dimOff = 700;
  const spanY = -O - dimOff;
  const projY = y0 < 4 ? spanY : y0 - O - 420;
  const dims: PlanDim[] = [
    {
      x1: 0,
      y1: spanY,
      x2: W,
      y2: spanY,
      label: "span",
      valueMm: W,
    },
    {
      x1: W + O + dimOff,
      y1: 0,
      x2: W + O + dimOff,
      y2: L,
      label: "long",
      valueMm: L,
    },
    {
      x1: wingOuterX,
      y1: projY,
      x2: 0,
      y2: projY,
      label: "projection",
      valueMm: P,
    },
    {
      x1: wingOuterX - O - dimOff,
      y1: y0,
      x2: wingOuterX - O - dimOff,
      y2: y1,
      label: "wing span",
      valueMm: S,
    },
    {
      x1: wingOuterX,
      y1: L + O + dimOff,
      x2: W,
      y2: L + O + dimOff,
      label: "overall",
      valueMm: W + P,
    },
  ];

  return {
    kind: inputs.junction,
    wing,
    internal,
    valleys,
    brokenHips,
    minorRidge,
    minorHips,
    members,
    labels,
    dims,
    equalSpan,
    minorHalf,
    majorHalf,
    junctionPts,
    wingOuterX,
    wingHipped,
    y0,
    y1,
    cy,
    flushNearEnd,
  };
}
