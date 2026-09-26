import type { RoofInputs } from "./types";

export type Seg = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
};

export type RafterKind =
  | "common"
  | "jack"
  | "centering"
  | "crown"
  | "valley-jack"
  | "cripple"
  | "broken-hip-jack";

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

/**
 * X on a segment at `y`, or null when `y` is outside the open span.
 * Endpoints are excluded so a rafter is not drawn on top of the hip's ends.
 */
export function xOnOpenSegment(seg: Seg, y: number, margin = 8): number | null {
  const yLo = Math.min(seg.y1, seg.y2);
  const yHi = Math.max(seg.y1, seg.y2);
  if (y <= yLo + margin || y >= yHi - margin) return null;
  const dy = seg.y2 - seg.y1;
  if (Math.abs(dy) < 1) return null;
  const t = (y - seg.y1) / dy;
  if (t <= 0 || t >= 1) return null;
  return seg.x1 + (seg.x2 - seg.x1) * t;
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

  // Broken hip: from where the minor ridge meets the valley, at 45° onto the
  // major ridge, on the valley's side of that meeting point. Continuing the
  // valley's own diagonal (the other 45°) runs into the flush side of an L
  // and misses the ridge/valley junction.
  const yLo = majorHalf * 0.15;
  const yHi = L - yLo;
  junctionPts.forEach((jPt, cornerIndex) => {
    const rise = majorHalf - jPt.x;
    if (rise < 40) return;
    const cornerY = internal[cornerIndex]?.y ?? jPt.y;
    const toward = cornerY >= jPt.y ? 1 : -1;
    let y2 = jPt.y + rise * toward;
    y2 = Math.max(yLo, Math.min(yHi, y2));
    if (Math.abs(y2 - jPt.y) < 40 || Math.sign(y2 - jPt.y) !== toward) return;
    const br: Seg = { x1: jPt.x, y1: jPt.y, x2: majorHalf, y2, label: "Broken hip" };
    brokenHips.push(br);
    const dx = br.x2 - br.x1;
    const dy = br.y2 - br.y1;
    const len = Math.hypot(dx, dy) || 1;
    let px = -dy / len;
    let py = dx / len;
    if (px > 0) {
      px = -px;
      py = -py;
    }
    labels.push({
      x: (br.x1 + br.x2) / 2 + px * 320,
      y: (br.y1 + br.y2) / 2 + py * 320,
      text: "Broken hip",
    });
    const n = Math.max(1, Math.floor(Math.abs(br.y2 - jPt.y) / spacing) - 1);
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      const y = jPt.y + (br.y2 - jPt.y) * t;
      const vx = valleyXAtY(valleys, y);
      const xV = vx ?? jPt.x + (y - jPt.y) * ((jPt.x - 0) / ((jPt.y - cornerY) || 1));
      const xH = br.x1 + (br.x2 - br.x1) * t;
      addMember(members, xV, y, xH, y, "cripple", i === 1 && cornerIndex === 0 ? { tag: "cripple" } : undefined);
    }
  });

  // A horizontal rafter that crosses a broken hip is cut so it lands on the hip
  // instead of running through it. The ridge side of that bay is filled below.
  for (let i = members.length - 1; i >= 0; i--) {
    const m = members[i];
    if (Math.abs(m.y1 - m.y2) > 2) continue;
    const y = m.y1;
    let xA = m.x1;
    let xB = m.x2;
    let clipped = false;
    for (const hip of brokenHips) {
      const xHip = xOnOpenSegment(hip, y);
      if (xHip == null) continue;
      const lo = Math.min(xA, xB);
      const hi = Math.max(xA, xB);
      if (lo < xHip - 15 && hi > xHip + 15) {
        if (xA >= xB) xA = xHip;
        else xB = xHip;
        clipped = true;
      }
    }
    if (!clipped) continue;
    const planMm = Math.hypot(xB - xA, m.y2 - m.y1);
    if (planMm < 50) {
      members.splice(i, 1);
      continue;
    }
    members[i] = { ...m, x1: xA, x2: xB, planMm };
  }

  // Rafters that run into the broken hip and were not already drawn.
  // When the hip is the shortened near-end hip (L, hip end), they are the
  // near-plate jacks whose landing still sits on that hip — same centres as
  // the other hip jacks on that wall. Otherwise the hip meets the major ridge
  // inboard (T), and the infill runs square off that ridge onto the hip.
  for (const br of brokenHips) {
    const added: MemberSeg[] = [];
    const pushJack = (x1: number, y1: number, x2: number, y2: number) => {
      const before = members.length;
      addMember(members, x1, y1, x2, y2, "broken-hip-jack");
      if (members.length > before) added.push(members[members.length - 1]);
    };
    const meetsNearApex =
      leftHip && Math.abs(br.x2 - majorHalf) < 4 && Math.abs(br.y2 - majorHalf) < 4;
    if (meetsNearApex) {
      for (let d = spacing; d < majorHalf - 8; d += spacing) {
        const xHip = xOnOpenSegment(br, d);
        if (xHip == null || Math.abs(xHip - d) > 8) continue;
        pushJack(d, 0, d, d);
      }
    }
    if (added.length === 0) {
      const span = Math.abs(br.y2 - br.y1);
      const sign = Math.sign(br.y1 - br.y2) || 1;
      for (const d of stationsFromCorner(span, spacing)) {
        const y = br.y2 + sign * d;
        const xHip = xOnOpenSegment(br, y);
        if (xHip == null || majorHalf - xHip < 50) continue;
        pushJack(majorHalf, y, xHip, y);
      }
    }
    const longest = added.reduce<MemberSeg | null>(
      (best, m) => (best == null || m.planMm > best.planMm ? m : best),
      null,
    );
    if (longest) longest.tag = "broken-hip-jack";
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
      label: "wing length",
      valueMm: P,
    },
    {
      x1: wingOuterX - O - dimOff,
      y1: y0,
      x2: wingOuterX - O - dimOff,
      y2: y1,
      label: "wing width/span",
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
