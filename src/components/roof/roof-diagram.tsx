import { useMemo, useState } from "react";
import { ProSection } from "@/components/pro-section";
import { HipSetoutView } from "@/components/roof/hip-setout";
import { useUnlock } from "@/components/unlock-provider";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { mm } from "@/lib/roof/format";
import { junctionLayout, type MemberSeg } from "@/lib/roof/junction";
import type { RoofInputs, RoofResult } from "@/lib/roof/types";
import { cn } from "@/lib/utils";

type LengthAccess = {
  hip: boolean;
  creeper: boolean;
  junction: boolean;
};

type View = "iso" | "plan" | "section" | "setout";

type Pt = { x: number; y: number };

function iso(x: number, y: number, z: number): Pt {
  return {
    x: (x - y) * Math.cos(Math.PI / 6),
    y: (x + y) * Math.sin(Math.PI / 6) - z,
  };
}

function poly(pts: Pt[]): string {
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

function line(a: Pt, b: Pt): string {
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} L ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

function bounds(pts: Pt[], pad: number) {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  return { minX, minY, w: maxX - minX, h: maxY - minY };
}

function roofGeometry(i: RoofInputs) {
  const W = i.widthMm;
  const L = i.lengthMm;
  const O = i.overhangMm;
  const pitch = (i.pitchDeg * Math.PI) / 180;
  const half = W / 2;
  const wall = 2400;
  const rise = half * Math.tan(pitch);
  const eZ = wall - O * Math.tan(pitch);
  const rZ = wall + rise;
  const leftHip = i.leftEnd === "hip";
  const rightHip = i.rightEnd === "hip";
  const yR0 = leftHip ? half : -O;
  const yR1 = rightHip ? L - half : L + O;
  return { W, L, O, wall, rise, eZ, rZ, leftHip, rightHip, yR0, yR1, half, pitch };
}

export function RoofDiagram({
  inputs,
  result,
}: {
  inputs: RoofInputs;
  result: RoofResult;
}) {
  const [view, setView] = useState<View>("iso");
  const { isSectionOpen } = useUnlock();
  const access: LengthAccess = {
    hip: isSectionOpen("hip"),
    creeper: isSectionOpen("creeper"),
    junction: isSectionOpen("junction"),
  };
  return (
    <section className="flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Roof
          </p>
          <h2 className="font-sans text-lg font-medium tracking-tight">
            {inputs.leftEnd === "hip" && inputs.rightEnd === "hip"
              ? "Hip roof"
              : inputs.leftEnd === "gable" && inputs.rightEnd === "gable"
                ? "Gable roof"
                : "Hip / gable"}
            {inputs.junction === "L" ? " · L-junction" : inputs.junction === "T" ? " · T-junction" : ""}
          </h2>
        </div>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => {
            if (v) setView(v as View);
          }}
          size="sm"
          className="w-auto max-w-full flex-wrap no-print"
        >
          <ToggleGroupItem value="iso">Isometric</ToggleGroupItem>
          <ToggleGroupItem value="plan">Plan</ToggleGroupItem>
          <ToggleGroupItem value="section">Section</ToggleGroupItem>
          <ToggleGroupItem value="setout">Hip set-out</ToggleGroupItem>
        </ToggleGroup>
      </header>
      <div className="relative overflow-hidden bg-[#ece7da] px-2 py-3 sm:px-4 sm:py-5">
        {view === "iso" ? (
          <IsoView inputs={inputs} result={result} />
        ) : view === "plan" ? (
          <PlanView inputs={inputs} result={result} access={access} />
        ) : view === "section" ? (
          <SectionView inputs={inputs} result={result} />
        ) : access.hip ? (
          <HipSetoutView inputs={inputs} result={result} />
        ) : (
          <div className="px-3 py-6 sm:px-5">
            <ProSection
              tool="hip"
              title="Hip set-out"
              detail="The hip set-out drawing stays on this roof. Preview once, or unlock Pro."
            />
          </div>
        )}
      </div>
      <footer className="flex flex-wrap gap-2 border-t border-border px-4 py-3 sm:px-5">
        <Badge variant="muted">{result.pitchDeg}° pitch</Badge>
        <Badge variant="muted">{mm(result.risePerMetreMm)} rise / m</Badge>
        <Badge variant="muted">{inputs.spacingMm} mm centres</Badge>
        {access.hip && result.hipCount > 0 ? <Badge variant="muted">{result.hipCount} hips</Badge> : null}
        {access.junction && result.valleyCount > 0 ? (
          <Badge variant="muted">{result.valleyCount} valleys</Badge>
        ) : null}
      </footer>
    </section>
  );
}

function IsoView({ inputs, result }: { inputs: RoofInputs; result: RoofResult }) {
  const { paths, vb } = useMemo(() => {
    const g = roofGeometry(inputs);
    const { W, L, O, wall, eZ, rZ, leftHip, rightHip, yR0, yR1 } = g;
    const jn = inputs.junction === "none" ? null : junctionLayout(inputs);

    const FL = { x: -O, y: -O, z: eZ };
    const FR = { x: W + O, y: -O, z: eZ };
    const BR = { x: W + O, y: L + O, z: eZ };
    const BL = { x: -O, y: L + O, z: eZ };
    const R0 = { x: W / 2, y: yR0, z: rZ };
    const R1 = { x: W / 2, y: yR1, z: rZ };

    const wFL = { x: 0, y: 0, z: 0 };
    const wFR = { x: W, y: 0, z: 0 };
    const wBR = { x: W, y: L, z: 0 };
    const wBL = { x: 0, y: L, z: 0 };
    const tFL = { x: 0, y: 0, z: wall };
    const tFR = { x: W, y: 0, z: wall };
    const tBR = { x: W, y: L, z: wall };
    const tBL = { x: 0, y: L, z: wall };

    const I = (p: { x: number; y: number; z: number }) => iso(p.x, p.y, p.z);

    type P3 = { x: number; y: number; z: number };
    const frontPolys: P3[][] = [];
    const wallLeftPolys: P3[][] = [];
    const extraWalls: P3[][] = [];
    const wingPlanes: P3[][] = [];
    const hips: string[] = [];
    const eaves: string[] = [line(I(FR), I(BR)), line(I(FL), I(FR)), line(I(BL), I(BR))];
    let valleyPaths: string[] = [];
    let brokenHipPaths: string[] = [];
    let minorRidgePath = "";
    let nearHip: P3[] | null = leftHip ? [FL, FR, R0] : null;
    const farHip: P3[] | null = rightHip ? [BL, BR, R1] : null;

    const ridgeAtY = (y: number): P3 => ({
      x: W / 2,
      y: Math.max(yR0, Math.min(yR1, y)),
      z: rZ,
    });

    if (!jn) {
      frontPolys.push([FL, BL, R1, R0]);
      wallLeftPolys.push([wFL, wBL, tBL, tFL]);
      eaves.push(line(I(FL), I(BL)));
      if (leftHip) hips.push(line(I(FL), I(R0)), line(I(FR), I(R0)));
      if (rightHip) hips.push(line(I(BL), I(R1)), line(I(BR), I(R1)));
    } else {
      const y0 = jn.y0;
      const y1 = jn.y1;
      const cy = jn.cy;
      const P = -jn.wingOuterX;
      const tanP = Math.tan(g.pitch);
      const mZ = wall + jn.minorHalf * tanP;
      const jZ = wall + Math.min(g.half, jn.minorHalf) * tanP;
      const wx = -P - O;
      const WN = { x: wx, y: y0 - O, z: eZ };
      const WF = { x: wx, y: y1 + O, z: eZ };
      const mR: P3 = {
        x: jn.wingHipped ? -P + jn.minorHalf : wx,
        y: cy,
        z: mZ,
      };
      const Ve0: P3 = { x: 0, y: y0, z: eZ };
      const Ve1: P3 = { x: 0, y: y1, z: eZ };
      const J0: P3 = jn.junctionPts[0]
        ? { x: jn.junctionPts[0].x, y: jn.junctionPts[0].y, z: jZ }
        : { x: W / 2, y: cy, z: rZ };
      const J1: P3 = jn.junctionPts[1]
        ? { x: jn.junctionPts[1].x, y: jn.junctionPts[1].y, z: jZ }
        : J0;
      const minorEnd: P3 = jn.equalSpan ? { x: W / 2, y: cy, z: rZ } : { x: (J0.x + J1.x) / 2, y: cy, z: jZ };

      if (jn.flushNearEnd) {
        frontPolys.push([Ve1, BL, R1, ridgeAtY(y1)]);
        wallLeftPolys.push([
          { x: 0, y: y1, z: 0 },
          wBL,
          tBL,
          { x: 0, y: y1, z: wall },
        ]);
        eaves.push(line(I(Ve1), I(BL)));
        if (leftHip) {
          nearHip = [
            { x: 0, y: -O, z: eZ },
            FR,
            R0,
          ];
          hips.push(line(I(FR), I(R0)));
        }
      } else {
        frontPolys.push([FL, { x: -O, y: y0, z: eZ }, ridgeAtY(y0), R0]);
        frontPolys.push([{ x: -O, y: y1, z: eZ }, BL, R1, ridgeAtY(y1)]);
        if (y0 > 40) {
          wallLeftPolys.push([wFL, { x: 0, y: y0, z: 0 }, { x: 0, y: y0, z: wall }, tFL]);
          eaves.push(line(I(FL), I({ x: -O, y: y0, z: eZ })));
        }
        wallLeftPolys.push([
          { x: 0, y: y1, z: 0 },
          wBL,
          tBL,
          { x: 0, y: y1, z: wall },
        ]);
        eaves.push(line(I({ x: -O, y: y1, z: eZ }), I(BL)));
        if (leftHip) hips.push(line(I(FL), I(R0)), line(I(FR), I(R0)));
      }
      if (rightHip) hips.push(line(I(BL), I(R1)), line(I(BR), I(R1)));

      extraWalls.push(
        [
          { x: -P, y: y0, z: 0 },
          { x: -P, y: y1, z: 0 },
          { x: -P, y: y1, z: wall },
          { x: -P, y: y0, z: wall },
        ],
        [
          { x: -P, y: y0, z: 0 },
          { x: 0, y: y0, z: 0 },
          { x: 0, y: y0, z: wall },
          { x: -P, y: y0, z: wall },
        ],
        [
          { x: -P, y: y1, z: 0 },
          { x: 0, y: y1, z: 0 },
          { x: 0, y: y1, z: wall },
          { x: -P, y: y1, z: wall },
        ],
      );

      if (jn.wingHipped) {
        wingPlanes.push([WN, WF, mR]);
        hips.push(line(I(WN), I(mR)), line(I(WF), I(mR)));
      } else {
        wingPlanes.push([WN, WF, mR]);
      }
      if (jn.flushNearEnd) {
        wingPlanes.push([WN, { x: 0, y: -O, z: eZ }, mR]);
        wingPlanes.push([WF, Ve1, J0, mR]);
      } else {
        wingPlanes.push([WN, Ve0, J0, mR]);
        wingPlanes.push([WF, Ve1, J1, mR]);
      }

      minorRidgePath = line(I(mR), I(minorEnd));
      if (jn.kind === "L") {
        valleyPaths = [line(I(Ve1), I(J0))];
      } else {
        valleyPaths = [line(I(Ve0), I(J0)), line(I(Ve1), I(J1))];
      }
      brokenHipPaths = jn.brokenHips.map((s) => {
        const a = { x: s.x1, y: s.y1, z: jZ };
        const b = { x: s.x2, y: s.y2, z: rZ };
        return line(I(a), I(b));
      });
      eaves.push(line(I(WN), I(WF)), line(I(WN), I({ x: 0, y: y0 - O, z: eZ })), line(I(WF), I({ x: 0, y: y1 + O, z: eZ })));
    }

    const rafters: string[] = [];
    const step = inputs.spacingMm;
    const ySkip0 = jn?.y0 ?? -1e9;
    const ySkip1 = jn?.y1 ?? -1e9;
    for (let y = step; y < L; y += step) {
      if (jn && y > ySkip0 + 8 && y < ySkip1 - 8) continue;
      const atHipNear = leftHip && y < g.half;
      const atHipFar = rightHip && y > L - g.half;
      const xInner = atHipNear ? y : atHipFar ? L - y : 0;
      const t = (xInner + O) / (W / 2 + O);
      const z0 = eZ + t * (rZ - eZ);
      const x0 = -O + t * (W / 2 + O);
      rafters.push(line(I({ x: -O, y, z: eZ }), I({ x: x0, y, z: z0 })));
    }

    const frontPts = frontPolys.flatMap((p) => p.map(I));
    const wingPts = wingPlanes.flatMap((p) => p.map(I));
    const wallLeftPts = wallLeftPolys.flatMap((p) => p.map(I));
    const extraWallPts = extraWalls.flatMap((p) => p.map(I));
    const nearHipPts = nearHip ? nearHip.map(I) : [];
    const farHipPts = farHip ? farHip.map(I) : [];
    const wallRight = [I(wFR), I(wBR), I(tBR), I(tFR)];
    const wallNear = [I(wFL), I(wFR), I(tFR), I(tFL)];
    const back = [I(FR), I(BR), I(R1), I(R0)];
    const ridge = line(I(R0), I(R1));

    const all = [
      ...frontPts,
      ...back,
      ...nearHipPts,
      ...farHipPts,
      ...wallRight,
      ...wallNear,
      ...wallLeftPts,
      ...wingPts,
      ...extraWallPts,
      I(wBL),
      I(tBL),
    ];
    const vb = bounds(all, 900);

    return {
      vb,
      paths: {
        wallRight: poly(wallRight),
        wallNear: poly(wallNear),
        wallLeft: wallLeftPolys.map((p) => poly(p.map(I))),
        extraWalls: extraWalls.map((p) => poly(p.map(I))),
        front: frontPolys.map((p) => poly(p.map(I))),
        back: poly(back),
        nearHip: nearHip ? poly(nearHip.map(I)) : null,
        farHip: farHip ? poly(farHip.map(I)) : null,
        ridge,
        hips,
        eaves,
        rafters,
        valleyPaths,
        brokenHipPaths,
        minorRidgePath,
        wingPlanes: wingPlanes.map((p) => poly(p.map(I))),
        ground: poly([I(wFL), I(wFR), I(wBR), I(wBL)]),
      },
    };
  }, [inputs]);

  return (
    <svg
      viewBox={`${vb.minX} ${vb.minY} ${vb.w} ${vb.h}`}
      className="pointer-events-none mx-auto h-auto w-full max-h-[420px]"
      role="img"
      aria-label="Isometric roof"
    >
      <polygon points={paths.ground} fill="#d8d1c0" opacity="0.55" />
      {paths.wallLeft.map((p, i) => (
        <polygon key={`wl${i}`} points={p} fill="#cfc6b4" />
      ))}
      <polygon points={paths.wallNear} fill="#ddd6c6" />
      <polygon points={paths.wallRight} fill="#c4bbab" />
      {paths.extraWalls.map((p, i) => (
        <polygon key={`ew${i}`} points={p} fill={i === 0 ? "#b7ae9e" : "#c4bbab"} />
      ))}
      <polygon points={paths.back} fill="#6e746b" />
      {paths.farHip ? <polygon points={paths.farHip} fill="#646a63" /> : null}
      {paths.front.map((p, i) => (
        <polygon key={`f${i}`} points={p} fill="#5c6158" />
      ))}
      {paths.nearHip ? <polygon points={paths.nearHip} fill="#525850" /> : null}
      {paths.wingPlanes.map((p, i) => (
        <polygon
          key={`wp${i}`}
          points={p}
          fill={i === 0 ? "#4a5048" : i === 1 ? "#585e56" : "#505650"}
          opacity="0.98"
        />
      ))}
      {paths.rafters.map((d, i) => (
        <path key={i} d={d} stroke="#d9d2c3" strokeWidth="28" opacity="0.28" fill="none" />
      ))}
      {paths.eaves.map((d, i) => (
        <path key={i} d={d} stroke="#2a2723" strokeWidth="36" fill="none" />
      ))}
      {paths.hips.map((d, i) => (
        <path key={`h${i}`} d={d} stroke="#ece7dc" strokeWidth="48" fill="none" />
      ))}
      {paths.valleyPaths.map((d, i) => (
        <path key={`v${i}`} d={d} stroke="#1c1916" strokeWidth="48" strokeDasharray="80 50" fill="none" />
      ))}
      {paths.brokenHipPaths.map((d, i) => (
        <path key={`bh${i}`} d={d} stroke="#ece7dc" strokeWidth="44" fill="none" />
      ))}
      {paths.minorRidgePath ? (
        <path d={paths.minorRidgePath} stroke="#f3efe4" strokeWidth="56" fill="none" />
      ) : null}
      {result.ridgeLengthMm > 0 ? (
        <path d={paths.ridge} stroke="#f3efe4" strokeWidth="70" fill="none" />
      ) : null}
    </svg>
  );
}

function PlanView({
  inputs,
  result,
  access,
}: {
  inputs: RoofInputs;
  result: RoofResult;
  access: LengthAccess;
}) {
  const W = inputs.widthMm;
  const L = inputs.lengthMm;
  const O = inputs.overhangMm;
  const pad = 700;
  const leftHip = inputs.leftEnd === "hip";
  const rightHip = inputs.rightEnd === "hip";
  const half = W / 2;
  const yR0 = leftHip ? half : 0;
  const yR1 = rightHip ? L - half : L;
  const s = inputs.spacingMm;
  const jn = junctionLayout(inputs);
  const flushNear = jn?.flushNearEnd ?? false;
  const wingY0 = jn?.y0 ?? -1e9;
  const wingY1 = jn?.y1 ?? -1e9;
  const inWingY = (y: number) => y >= wingY0 - 4 && y <= wingY1 + 4;

  type Seg = { x1: number; y1: number; x2: number; y2: number; kind?: "jack" | "centering" | "crown" };
  const rafters: Seg[] = [];

  // Hip jacks: from each external corner, at centres, inward toward the end jack.
  // 45° hip → a jack at `d` from the corner meets the hip at `d` and stops.
  if (leftHip) {
    for (let d = s; d < half - 8; d += s) {
      if (!flushNear) {
        rafters.push({ x1: d, y1: 0, x2: d, y2: d, kind: "jack" });
        if (!inWingY(d)) rafters.push({ x1: 0, y1: d, x2: d, y2: d, kind: "jack" });
      }
      rafters.push({ x1: W - d, y1: 0, x2: W - d, y2: d, kind: "jack" });
      rafters.push({ x1: W - d, y1: d, x2: W, y2: d, kind: "jack" });
    }
  }
  if (rightHip) {
    for (let d = s; d < half - 8; d += s) {
      const y = L - d;
      rafters.push({ x1: d, y1: L, x2: d, y2: y, kind: "jack" });
      rafters.push({ x1: W - d, y1: L, x2: W - d, y2: y, kind: "jack" });
      if (!inWingY(y)) rafters.push({ x1: 0, y1: y, x2: d, y2: y, kind: "jack" });
      rafters.push({ x1: W - d, y1: y, x2: W, y2: y, kind: "jack" });
    }
  }

  // Commons — square off the ridge, between the hip / gable ends (not through the hips).
  const yLo = leftHip ? half + s : s;
  const yHi = rightHip ? L - half : L;
  for (let y = yLo; y < yHi - 4; y += s) {
    if (rightHip && Math.abs(y - (L - half)) < 8) continue;
    if (inWingY(y)) rafters.push({ x1: half, y1: y, x2: W, y2: y });
    else rafters.push({ x1: 0, y1: y, x2: W, y2: y });
  }

  if (leftHip && !result.pyramid) {
    if (!flushNear) {
      rafters.push({ x1: 0, y1: half, x2: half, y2: half, kind: "centering" });
    }
    rafters.push({ x1: half, y1: half, x2: W, y2: half, kind: "centering" });
    rafters.push({ x1: half, y1: 0, x2: half, y2: half, kind: "crown" });
  }
  if (rightHip && !result.pyramid) {
    rafters.push({ x1: 0, y1: L - half, x2: half, y2: L - half, kind: "centering" });
    rafters.push({ x1: half, y1: L - half, x2: W, y2: L - half, kind: "centering" });
    rafters.push({ x1: half, y1: L, x2: half, y2: L - half, kind: "crown" });
  }

  const wingX = jn ? jn.wing.x : 0;
  const minX = Math.min(-O, wingX - O) - pad - (jn ? 1200 : 0);
  const maxX = W + O + pad + (jn ? 500 : 0);
  const minY = -O - pad - (jn ? 900 : 0);
  const maxY = L + O + pad + (jn ? 1000 : 0);

  const cosP = Math.cos(result.pitchRad);
  const slopeLen = (plan: number) => plan / cosP;

  function memberCaption(m: MemberSeg): string | null {
    if (m.tag === "end-jack") {
      return access.creeper ? `End jack ${mm(result.endJackCuttingMm)}` : null;
    }
    if (m.tag === "centering") return `Centering ${mm(result.commonToBirdsmouthMm)}`;
    if (m.tag === "common-wing") {
      return access.junction ? `Common ${mm(slopeLen(m.planMm))}` : null;
    }
    if (m.tag === "1st-jack") {
      if (!access.creeper) return null;
      const c = result.creepers[0];
      return `1st jack ${mm(c?.toBirdsmouthMm ?? slopeLen(m.planMm))}`;
    }
    if (m.tag === "2nd-jack") {
      if (!access.creeper) return null;
      const c = result.creepers[1];
      return `2nd jack ${mm(c?.toBirdsmouthMm ?? slopeLen(m.planMm))}`;
    }
    if (m.tag === "valley-jack") {
      return access.junction ? `Valley jack ${mm(slopeLen(m.planMm))}` : null;
    }
    if (m.tag === "cripple") {
      return access.junction ? `Cripple jack ${mm(slopeLen(m.planMm))}` : null;
    }
    return null;
  }

  const sampleCommon = rafters.find((r) => !r.kind && Math.abs(r.x2 - r.x1) > half * 0.8);

  function kindStroke(kind: MemberSeg["kind"] | Seg["kind"]) {
    if (kind === "crown" || kind === "centering") return { stroke: "#1c1916", width: 36, opacity: 0.9 };
    if (kind === "cripple") return { stroke: "#2d4a3c", width: 16, opacity: 0.55 };
    if (kind === "valley-jack") return { stroke: "#2d4a3c", width: 16, opacity: 0.5 };
    return { stroke: "#2d4a3c", width: 16, opacity: 0.45 };
  }

  return (
    <div>
      <svg
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
        className="pointer-events-none mx-auto h-auto w-full max-h-[560px]"
        role="img"
        aria-label="Roof plan"
      >
        <rect
          x={-O}
          y={-O}
          width={W + 2 * O}
          height={L + 2 * O}
          fill="#d8d3c4"
          stroke="#1c1916"
          strokeWidth="40"
        />
        {jn ? (
          <rect
            x={jn.wing.x - O}
            y={jn.wing.y - O}
            width={jn.wing.w + O}
            height={jn.wing.h + 2 * O}
            fill="#d8d3c4"
            stroke="#1c1916"
            strokeWidth="40"
          />
        ) : null}
        <rect
          x={0}
          y={0}
          width={W}
          height={L}
          fill="none"
          stroke="#1c1916"
          strokeWidth="24"
          strokeDasharray="80 50"
        />
        {jn ? (
          <rect
            x={jn.wing.x}
            y={jn.wing.y}
            width={jn.wing.w}
            height={jn.wing.h}
            fill="none"
            stroke="#1c1916"
            strokeWidth="24"
            strokeDasharray="80 50"
          />
        ) : null}
        {rafters.map((r, i) => {
          const st = kindStroke(r.kind);
          return (
            <line
              key={`r${i}`}
              x1={r.x1}
              y1={r.y1}
              x2={r.x2}
              y2={r.y2}
              stroke={st.stroke}
              strokeWidth={st.width}
              opacity={st.opacity}
            />
          );
        })}
        {jn
          ? jn.members.map((m, i) => {
              const st = kindStroke(m.kind);
              return (
                <line
                  key={`m${i}`}
                  x1={m.x1}
                  y1={m.y1}
                  x2={m.x2}
                  y2={m.y2}
                  stroke={st.stroke}
                  strokeWidth={st.width}
                  opacity={st.opacity}
                />
              );
            })
          : null}
        {leftHip ? (
          <>
            {flushNear ? null : <line x1={0} y1={0} x2={half} y2={half} stroke="#1c1916" strokeWidth="40" />}
            <line x1={W} y1={0} x2={half} y2={half} stroke="#1c1916" strokeWidth="40" />
          </>
        ) : (
          <line x1={0} y1={0} x2={W} y2={0} stroke="#1c1916" strokeWidth="36" />
        )}
        {rightHip ? (
          <>
            <line x1={0} y1={L} x2={half} y2={L - half} stroke="#1c1916" strokeWidth="40" />
            <line x1={W} y1={L} x2={half} y2={L - half} stroke="#1c1916" strokeWidth="40" />
          </>
        ) : (
          <line x1={0} y1={L} x2={W} y2={L} stroke="#1c1916" strokeWidth="36" />
        )}
        {result.ridgeLengthMm > 0 ? (
          <line x1={half} y1={yR0} x2={half} y2={yR1} stroke="#2d4a3c" strokeWidth="56" />
        ) : null}
        {leftHip && !result.pyramid && !flushNear ? (
          <>
            <text
              x={half + 160}
              y={half * 0.52}
              fontSize="200"
              fill="#1c1916"
              fontFamily="Outfit, sans-serif"
            >
              End jack
            </text>
            <text
              x={half * 0.22}
              y={half - 120}
              fontSize="200"
              fill="#1c1916"
              fontFamily="Outfit, sans-serif"
            >
              Centering
            </text>
          </>
        ) : null}
        {rightHip && !result.pyramid ? (
          <>
            <text
              x={half + 160}
              y={L - half * 0.48}
              fontSize="200"
              fill="#1c1916"
              fontFamily="Outfit, sans-serif"
            >
              End jack
            </text>
            <text
              x={half * 0.22}
              y={L - half + 280}
              fontSize="200"
              fill="#1c1916"
              fontFamily="Outfit, sans-serif"
            >
              Centering
            </text>
          </>
        ) : null}
        {jn
          ? jn.minorHips.map((seg, i) => (
              <line key={`mh${i}`} x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke="#1c1916" strokeWidth="40" />
            ))
          : null}
        {jn && !jn.wingHipped ? (
          <text
            x={jn.wingOuterX + 120}
            y={jn.cy - 200}
            fontSize="190"
            fill="#1c1916"
            fontFamily="Outfit, sans-serif"
          >
            Gable
          </text>
        ) : null}
        {jn
          ? jn.valleys.map((seg, i) => (
              <line
                key={`v${i}`}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke="#2d4a3c"
                strokeWidth="40"
                strokeDasharray="80 50"
              />
            ))
          : null}
        {jn
          ? jn.brokenHips.map((seg, i) => (
              <line key={`bh${i}`} x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke="#1c1916" strokeWidth="36" />
            ))
          : null}
        {jn && jn.minorRidge ? (
          <line
            x1={jn.minorRidge.x1}
            y1={jn.minorRidge.y1}
            x2={jn.minorRidge.x2}
            y2={jn.minorRidge.y2}
            stroke="#2d4a3c"
            strokeWidth="56"
          />
        ) : null}
        {jn
          ? jn.members.map((m, i) => {
              const caption = memberCaption(m);
              if (!caption) return null;
              const mx = (m.x1 + m.x2) / 2;
              const my = (m.y1 + m.y2) / 2;
              const dx = m.x2 - m.x1;
              const dy = m.y2 - m.y1;
              const len = Math.hypot(dx, dy) || 1;
              const ox = (-dy / len) * 160;
              const oy = (dx / len) * 160;
              let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
              if (angle > 90 || angle < -90) angle += 180;
              return (
                <text
                  key={`cap${i}`}
                  x={mx + ox}
                  y={my + oy}
                  textAnchor="middle"
                  fontSize="170"
                  fill="#1c1916"
                  fontFamily="IBM Plex Mono, monospace"
                  transform={`rotate(${angle} ${mx + ox} ${my + oy})`}
                >
                  {caption}
                </text>
              );
            })
          : null}
        {jn
          ? jn.labels.map((lb, i) => (
              <text
                key={`lb${i}`}
                x={lb.x}
                y={lb.y}
                fontSize={lb.size ?? 190}
                fill="#1c1916"
                fontFamily="Outfit, sans-serif"
              >
                {lb.text}
              </text>
            ))
          : null}
        {jn && jn.minorRidge && access.junction ? (
          <text
            x={(jn.minorRidge.x1 + jn.minorRidge.x2) / 2}
            y={jn.cy + 280}
            textAnchor="middle"
            fontSize="170"
            fill="#2d4a3c"
            fontFamily="IBM Plex Mono, monospace"
          >
            {`Minor ridge ${mm(Math.hypot(jn.minorRidge.x2 - jn.minorRidge.x1, jn.minorRidge.y2 - jn.minorRidge.y1))}`}
          </text>
        ) : null}
        {jn && access.hip
          ? jn.minorHips.slice(0, 1).map((seg, i) => (
              <text
                key={`hl${i}`}
                x={(seg.x1 + seg.x2) / 2 - 80}
                y={(seg.y1 + seg.y2) / 2 - 140}
                fontSize="160"
                fill="#1c1916"
                fontFamily="IBM Plex Mono, monospace"
              >
                {`Hip ${mm(result.hipToBirdsmouthMm)}`}
              </text>
            ))
          : null}
        {jn && access.junction
          ? jn.valleys.slice(0, 1).map((seg, i) => (
              <text
                key={`vl${i}`}
                x={seg.x1 + (seg.x2 - seg.x1) * 0.22 + 40}
                y={seg.y1 + (seg.y2 - seg.y1) * 0.22 + 200}
                fontSize="160"
                fill="#2d4a3c"
                fontFamily="IBM Plex Mono, monospace"
              >
                {`Valley ${mm(result.valleyToBirdsmouthMm)}`}
              </text>
            ))
          : null}
        {result.ridgeLengthMm > 0 ? (
          <text
            x={half + 240}
            y={(yR0 + yR1) / 2}
            textAnchor="middle"
            fontSize="170"
            fill="#2d4a3c"
            fontFamily="IBM Plex Mono, monospace"
            transform={`rotate(90 ${half + 240} ${(yR0 + yR1) / 2})`}
          >
            {`Ridge ${mm(result.ridgeLengthMm)}`}
          </text>
        ) : null}
        {sampleCommon ? (
          <text
            x={(sampleCommon.x1 + sampleCommon.x2) / 2}
            y={sampleCommon.y1 - 140}
            textAnchor="middle"
            fontSize="160"
            fill="#2d4a3c"
            fontFamily="IBM Plex Mono, monospace"
          >
            {`Common ${mm(result.commonToBirdsmouthMm)}`}
          </text>
        ) : null}
        {/* X marks — first common / end jack, half span from corners A */}
        {leftHip && !result.pyramid ? (
          <>
            <circle cx={half} cy={half} r="70" fill="none" stroke="#c23b22" strokeWidth="18" />
            <text x={half + 120} y={half + 280} fontSize="160" fill="#c23b22" fontFamily="IBM Plex Mono, monospace">
              X
            </text>
          </>
        ) : null}
        {rightHip && !result.pyramid ? (
          <>
            <circle cx={half} cy={L - half} r="70" fill="none" stroke="#c23b22" strokeWidth="18" />
            <text x={half + 120} y={L - half - 160} fontSize="160" fill="#c23b22" fontFamily="IBM Plex Mono, monospace">
              X
            </text>
          </>
        ) : null}
        {jn
          ? jn.dims.map((d, i) => (
              <PlanDim
                key={`d${i}`}
                x1={d.x1}
                y1={d.y1}
                x2={d.x2}
                y2={d.y2}
                label={`${mm(d.valueMm)} ${d.label}`}
              />
            ))
          : (
            <>
              <text
                x={half}
                y={-O - 180}
                textAnchor="middle"
                fontSize="280"
                fill="#1c1916"
                fontFamily="IBM Plex Mono, monospace"
              >
                {mm(W)} span
              </text>
              <text
                x={W + O + 220}
                y={L / 2}
                textAnchor="middle"
                fontSize="280"
                fill="#1c1916"
                fontFamily="IBM Plex Mono, monospace"
                transform={`rotate(90 ${W + O + 220} ${L / 2})`}
              >
                {mm(L)} long
              </text>
            </>
          )}
      </svg>
      {jn ? (
        <p className="mt-1 px-3 text-center text-[11px] leading-snug text-muted-foreground">
          Wing rafters run square off the minor ridge. Hip jacks at the outer end run square off each
          plate. Lengths are to the birdsmouth (long point of the cheek).
        </p>
      ) : null}
    </div>
  );
}

function PlanDim({
  x1,
  y1,
  x2,
  y2,
  label,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const tick = 200;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const off = 240;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle > 90 || angle < -90) angle += 180;
  return (
    <g stroke="#c23b22" fill="#c23b22">
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="22" />
      <line
        x1={x1 - px * tick}
        y1={y1 - py * tick}
        x2={x1 + px * tick}
        y2={y1 + py * tick}
        strokeWidth="22"
      />
      <line
        x1={x2 - px * tick}
        y1={y2 - py * tick}
        x2={x2 + px * tick}
        y2={y2 + py * tick}
        strokeWidth="22"
      />
      <text
        x={mx + px * off}
        y={my + py * off}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="240"
        fontFamily="IBM Plex Mono, monospace"
        fill="#c23b22"
        stroke="#ece7da"
        strokeWidth="28"
        paintOrder="stroke"
        transform={`rotate(${angle} ${mx + px * off} ${my + py * off})`}
      >
        {label}
      </text>
    </g>
  );
}

function DimLine({
  x1,
  y1,
  x2,
  y2,
  label,
  color = "#c23b22",
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  color?: string;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const tick = 6;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle > 90 || angle < -90) angle += 180;
  return (
    <g stroke={color} fill={color}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="1.2" />
      <line
        x1={x1 - px * tick}
        y1={y1 - py * tick}
        x2={x1 + px * tick}
        y2={y1 + py * tick}
        strokeWidth="1.2"
      />
      <line
        x1={x2 - px * tick}
        y1={y2 - py * tick}
        x2={x2 + px * tick}
        y2={y2 + py * tick}
        strokeWidth="1.2"
      />
      <text
        x={mx + px * 9}
        y={my + py * 9}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
        fontFamily="IBM Plex Mono, monospace"
        fill={color}
        stroke="#ece7da"
        strokeWidth="3"
        paintOrder="stroke"
        transform={`rotate(${angle} ${mx + px * 9} ${my + py * 9})`}
      >
        {label}
      </text>
    </g>
  );
}

function SectionView({ inputs, result }: { inputs: RoofInputs; result: RoofResult }) {
  const over = inputs.overhangMm;
  const depth = inputs.rafter.depth;
  const plate = inputs.plateWidthMm;
  const pitch = result.pitchRad;
  const ridgeB = Math.max(inputs.ridge.breadth, 35);
  const ridgeD = inputs.ridge.depth;
  const run = result.commonRunMm;
  const rise = result.riseMm;
  const seat = result.birdsmouth.seatMm;
  const bmPlumb = result.birdsmouth.plumbDepthMm;
  const tan = Math.tan(pitch);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const thickV = depth / cosP;

  const ridgeX = run;
  const eavesX = -over;
  const soffitY = (x: number) => (x - seat) * tan;
  const topAt = (x: number) => soffitY(x) + thickV;

  const fasciaBot = { x: eavesX, y: soffitY(eavesX) };
  const fasciaTop = { x: eavesX, y: topAt(eavesX) };
  const bmBot = { x: 0, y: soffitY(0) };
  const heel = { x: 0, y: 0 };
  const seatIn = { x: seat, y: 0 };
  const ridgeBot = { x: ridgeX, y: soffitY(ridgeX) };
  const ridgeTopRaf = { x: ridgeX, y: topAt(ridgeX) };
  const ridgeTopY = ridgeTopRaf.y;

  const VW = 640;
  const VH = 340;
  const worldLeft = eavesX - 80;
  const worldRight = ridgeX + ridgeB + 720;
  const worldTop = Math.max(ridgeTopY, rise) + 520;
  const worldBot = Math.min(fasciaBot.y, -40) - 420;
  const scale = Math.min((VW - 48) / (worldRight - worldLeft), (VH - 36) / (worldTop - worldBot));
  const originX = 24 - worldLeft * scale;
  const originY = 18 + worldTop * scale;
  const sx = (xmm: number) => originX + xmm * scale;
  const sy = (ymm: number) => originY - ymm * scale;

  const rafterPts = [fasciaBot, bmBot, heel, seatIn, ridgeBot, ridgeTopRaf, fasciaTop]
    .map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
    .join(" ");

  const above = 40 / scale;
  const below = 32 / scale;
  const nx = -sinP;
  const ny = cosP;

  const bmDimA = { x: 0 + nx * above, y: topAt(0) + ny * above };
  const bmDimB = { x: ridgeX + nx * above, y: topAt(ridgeX) + ny * above };
  const ohDimA = { x: eavesX - nx * below, y: soffitY(eavesX) - ny * below };
  const ohDimB = { x: 0 - nx * below, y: soffitY(0) - ny * below };
  const riseX = ridgeX + ridgeB + 280;

  const plateH = 64;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="mx-auto h-auto w-full max-h-[420px]" role="img" aria-label="Roof section">
      <rect x="0" y="0" width={VW} height={VH} fill="#ece7da" />
      <line x1="12" y1={sy(0)} x2={VW - 12} y2={sy(0)} stroke="#d9d2c3" strokeWidth="1" />
      {/* Top plate */}
      <rect
        x={sx(0)}
        y={sy(0)}
        width={Math.max(7, plate * scale)}
        height={plateH}
        fill="#cfc6b4"
        stroke="#1c1916"
        strokeWidth="1.2"
      />
      <text
        x={sx(plate / 2)}
        y={sy(0) + plateH + 12}
        textAnchor="middle"
        fontSize="9"
        fill="#6f685c"
        fontFamily="IBM Plex Mono, monospace"
      >
        plate {plate}
      </text>
      {/* Common rafter — plumb cut hard against the ridge face */}
      <polygon points={rafterPts} fill="#8a8376" stroke="#1c1916" strokeWidth="1.2" />
      <polyline
        points={`${sx(0)},${sy(Math.max(20, bmPlumb))} ${sx(0)},${sy(0)} ${sx(seat)},${sy(0)}`}
        fill="none"
        stroke="#2d4a3c"
        strokeWidth="2"
      />
      {/* Ridge board — rafter top lands flush, plumb face on the board */}
      <rect
        x={sx(ridgeX)}
        y={sy(ridgeTopY)}
        width={Math.max(5, ridgeB * scale)}
        height={Math.max(12, ridgeD * scale)}
        fill="#3d3830"
        stroke="#1c1916"
        strokeWidth="1"
      />
      <text
        x={sx(ridgeX + ridgeB / 2)}
        y={sy(ridgeTopY) - 8}
        textAnchor="middle"
        fontSize="9"
        fill="#1c1916"
        fontFamily="IBM Plex Mono, monospace"
      >
        ridge
      </text>
      {/* Extension lines to the to-BM dimension */}
      <line
        x1={sx(0)}
        y1={sy(topAt(0))}
        x2={sx(bmDimA.x)}
        y2={sy(bmDimA.y)}
        stroke="#c23b22"
        strokeWidth="0.8"
      />
      <line
        x1={sx(ridgeX)}
        y1={sy(ridgeTopY)}
        x2={sx(bmDimB.x)}
        y2={sy(bmDimB.y)}
        stroke="#c23b22"
        strokeWidth="0.8"
      />
      <DimLine
        x1={sx(bmDimA.x)}
        y1={sy(bmDimA.y)}
        x2={sx(bmDimB.x)}
        y2={sy(bmDimB.y)}
        label={`${mm(result.commonToBirdsmouthMm)} to BM`}
      />
      {/* Overhang / tail */}
      <line
        x1={sx(eavesX)}
        y1={sy(fasciaBot.y)}
        x2={sx(ohDimA.x)}
        y2={sy(ohDimA.y)}
        stroke="#c23b22"
        strokeWidth="0.8"
      />
      <line
        x1={sx(0)}
        y1={sy(bmBot.y)}
        x2={sx(ohDimB.x)}
        y2={sy(ohDimB.y)}
        stroke="#c23b22"
        strokeWidth="0.8"
      />
      <DimLine
        x1={sx(ohDimA.x)}
        y1={sy(ohDimA.y)}
        x2={sx(ohDimB.x)}
        y2={sy(ohDimB.y)}
        label={`overhang ${mm(result.commonOverhangMm)}`}
      />
      {/* Rise — vertical at the ridge */}
      <line
        x1={sx(ridgeX + ridgeB)}
        y1={sy(0)}
        x2={sx(riseX)}
        y2={sy(0)}
        stroke="#c23b22"
        strokeWidth="0.8"
      />
      <line
        x1={sx(ridgeX)}
        y1={sy(rise)}
        x2={sx(riseX)}
        y2={sy(rise)}
        stroke="#c23b22"
        strokeWidth="0.8"
      />
      <DimLine x1={sx(riseX)} y1={sy(0)} x2={sx(riseX)} y2={sy(rise)} label={`rise ${mm(rise)}`} />
    </svg>
  );
}

export function BirdsmouthFigure({ result, inputs }: { result: RoofResult; inputs: RoofInputs }) {
  const d = inputs.rafter.depth;
  const b = inputs.rafter.breadth;
  const seat = result.birdsmouth.seatMm;
  const plumb = result.birdsmouth.plumbDepthMm;
  const pitch = result.pitchRad;
  const plateW = inputs.plateWidthMm;

  const W = 320;
  const H = 180;
  const tailMm = Math.max(plumb * 1.8, 55);
  const runMm = seat + Math.max(d * 1.15, 90);
  const scale = Math.min(92 / d, 58 / Math.max(tailMm, 40), 110 / runMm);

  const heelX = 86;
  const plateTop = 112;
  const sx = (xMm: number) => heelX + xMm * scale;
  const sy = (yMm: number) => plateTop - yMm * scale;

  const tan = Math.tan(pitch);
  const soffitY = (xMm: number) => (xMm - seat) * tan;
  const perpX = -Math.sin(pitch) * d;
  const perpY = Math.cos(pitch) * d;

  const tailX = -tailMm;
  const ridgeX = runMm;
  const tailSof = { x: sx(tailX), y: sy(soffitY(tailX)) };
  const plumbBot = { x: sx(0), y: sy(soffitY(0)) };
  const heel = { x: sx(0), y: sy(0) };
  const seatIn = { x: sx(seat), y: sy(0) };
  const ridgeSof = { x: sx(ridgeX), y: sy(soffitY(ridgeX)) };
  const ridgeTop = { x: sx(ridgeX + perpX), y: sy(soffitY(ridgeX) + perpY) };
  const tailTop = { x: sx(tailX + perpX), y: sy(soffitY(tailX) + perpY) };

  const rafter = [tailSof, plumbBot, heel, seatIn, ridgeSof, ridgeTop, tailTop]
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const plateH = 16;
  const mark = Math.max(7, Math.min(12, seat * scale * 0.35));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-label="Birdsmouth cut">
      <text x="160" y="22" textAnchor="middle" fontSize="11" fill="#6f685c">
        {d} × {b} rafter · plumb notch {mm(plumb)} / max {mm(result.birdsmouth.maxPlumbMm)}
      </text>
      <polygon points={rafter} fill="#8a8376" stroke="#1c1916" strokeWidth="1.2" />
      {/* Backing line — 1/3 depth from the soffit. Birdsmouth stays below this. */}
      <line
        x1={sx(tailX + perpX / 3)}
        y1={sy(soffitY(tailX) + perpY / 3)}
        x2={sx(ridgeX + perpX / 3)}
        y2={sy(soffitY(ridgeX) + perpY / 3)}
        stroke="#c23b22"
        strokeWidth="1"
        strokeDasharray="4 3"
      />
      <text
        x={sx(ridgeX * 0.55)}
        y={sy(soffitY(ridgeX * 0.55) + perpY / 3) - 6}
        fontSize="9"
        fill="#c23b22"
        fontFamily="IBM Plex Mono, monospace"
      >
        backing ⅓
      </text>
      {/* Top plate — seat sits level on this, plumb against the outer face */}
      <rect
        x={heel.x}
        y={plateTop}
        width={Math.max(plateW * scale, seat * scale)}
        height={plateH}
        fill="#cfc6b4"
        stroke="#1c1916"
        strokeWidth="1"
      />
      {/* True 90° birdsmouth: vertical plumb, horizontal seat */}
      <polyline
        points={`${plumbBot.x.toFixed(1)},${plumbBot.y.toFixed(1)} ${heel.x.toFixed(1)},${heel.y.toFixed(1)} ${seatIn.x.toFixed(1)},${seatIn.y.toFixed(1)}`}
        fill="none"
        stroke="#2d4a3c"
        strokeWidth="2.2"
        strokeLinejoin="miter"
      />
      <path
        d={`M ${heel.x + mark} ${heel.y} L ${heel.x + mark} ${heel.y + mark} L ${heel.x} ${heel.y + mark}`}
        fill="none"
        stroke="#2d4a3c"
        strokeWidth="1.1"
      />
      <text
        x={heel.x - 8}
        y={(plumbBot.y + heel.y) / 2}
        textAnchor="end"
        dominantBaseline="middle"
        fontSize="10"
        fill="#2d4a3c"
        fontFamily="IBM Plex Mono, monospace"
      >
        plumb
      </text>
      <text
        x={(heel.x + seatIn.x) / 2}
        y={heel.y - 8}
        textAnchor="middle"
        fontSize="10"
        fill="#2d4a3c"
        fontFamily="IBM Plex Mono, monospace"
      >
        seat
      </text>
      <text x="160" y="168" textAnchor="middle" fontSize="10" fill="#6f685c" fontFamily="IBM Plex Mono, monospace">
        seat {mm(seat)} · plumb {mm(plumb)} · 90° at the plate
      </text>
    </svg>
  );
}

export function AngleChip({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[var(--radius-md)] border border-border bg-background px-3 py-3", className)}>
      <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-mono text-xl tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
