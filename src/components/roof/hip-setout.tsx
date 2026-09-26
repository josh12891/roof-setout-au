import { Lightbulb } from "lucide-react";
import { deg, mm } from "@/lib/roof/format";
import type { Creeper, RoofInputs, RoofResult } from "@/lib/roof/types";

type Pt = { x: number; y: number };

function Dim({
  x1,
  y1,
  x2,
  y2,
  label,
  color = "#c23b22",
  tick = 6,
  offset = 10,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  color?: string;
  tick?: number;
  offset?: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const mx = (x1 + x2) / 2 + px * offset;
  const my = (y1 + y2) / 2 + py * offset;
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
        x={mx}
        y={my}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
        fontFamily="IBM Plex Mono, monospace"
        fill={color}
        stroke="#ece7da"
        strokeWidth="3.5"
        paintOrder="stroke"
        transform={`rotate(${angle} ${mx} ${my})`}
      >
        {label}
      </text>
    </g>
  );
}

function HipCornerPlan({ inputs, result }: { inputs: RoofInputs; result: RoofResult }) {
  const half = result.halfSpanMm;
  const s = inputs.spacingMm;
  const O = inputs.overhangMm;
  const pad = 720;
  const S = half;
  const W = S + O + pad;
  const H = S + O + pad + 280;
  const ox = O + 80;
  const oy = H - O - 160;

  const X = (x: number) => ox + x;
  const Y = (y: number) => oy - y;

  const jacks = result.creepers;
  const c1 = jacks[0];
  const c2 = jacks[1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none mx-auto h-auto w-full max-h-[300px] overflow-hidden" role="img" aria-label="Hip corner plan">
      <rect x={X(-O)} y={Y(S + O)} width={S + 2 * O} height={S + 2 * O} fill="none" stroke="#1c1916" strokeWidth="22" />
      <rect x={X(0)} y={Y(S)} width={S} height={S} fill="none" stroke="#1c1916" strokeWidth="36" />
      <line x1={X(0)} y1={Y(0)} x2={X(S)} y2={Y(S)} stroke="#1c1916" strokeWidth="40" />
      <line x1={X(S)} y1={Y(S)} x2={X(S + 80)} y2={Y(S)} stroke="#2d4a3c" strokeWidth="48" />
      <line x1={X(S)} y1={Y(S)} x2={X(S)} y2={Y(S + 80)} stroke="#2d4a3c" strokeWidth="48" />

      {jacks.map((c) => {
        const d = c.fromCornerMm;
        return (
          <g key={c.index}>
            <line x1={X(d)} y1={Y(0)} x2={X(d)} y2={Y(d)} stroke="#5c6158" strokeWidth="18" />
            <line x1={X(0)} y1={Y(d)} x2={X(d)} y2={Y(d)} stroke="#5c6158" strokeWidth="18" />
          </g>
        );
      })}
      <line x1={X(S)} y1={Y(0)} x2={X(S)} y2={Y(S)} stroke="#5c6158" strokeWidth="22" />
      <line x1={X(0)} y1={Y(S)} x2={X(S)} y2={Y(S)} stroke="#5c6158" strokeWidth="22" />

      <circle cx={X(S)} cy={Y(S)} r="70" fill="none" stroke="#c23b22" strokeWidth="16" />
      <text x={X(S) + 90} y={Y(S) - 40} fontSize="140" fill="#c23b22" fontFamily="IBM Plex Mono, monospace">
        X
      </text>

      {c1 ? (
        <text x={X(c1.fromCornerMm) + 40} y={Y(c1.fromCornerMm / 2)} fontSize="130" fill="#1c1916" fontFamily="IBM Plex Mono, monospace">
          1st jack {mm(c1.toBirdsmouthMm, 1)}
        </text>
      ) : null}
      {c2 ? (
        <text x={X(c2.fromCornerMm) + 40} y={Y(c2.fromCornerMm / 2)} fontSize="130" fill="#1c1916" fontFamily="IBM Plex Mono, monospace">
          2nd jack {mm(c2.toBirdsmouthMm, 1)}
        </text>
      ) : null}
      <text x={X(S / 2)} y={Y(S) - 80} textAnchor="middle" fontSize="130" fill="#1c1916" fontFamily="IBM Plex Mono, monospace">
        Centering {mm(result.commonToBirdsmouthMm, 1)}
      </text>
      <text x={X(S / 2)} y={Y(S / 2) - 120} textAnchor="middle" fontSize="140" fill="#1c1916" fontFamily="Outfit, sans-serif">
        Hip 45°
      </text>

      <Dim
        x1={X(0)}
        y1={Y(-O - 180)}
        x2={X(s)}
        y2={Y(-O - 180)}
        label={`${mm(s)} centres`}
        offset={18}
        tick={40}
      />
    </svg>
  );
}

function CreeperPairing({ result }: { result: RoofResult }) {
  const list = result.creepers;
  if (!list.length) {
    return <p className="px-3 py-6 text-sm text-muted-foreground">No creepers at this spacing.</p>;
  }
  const cd = result.commonDifferenceMm;
  const tail = result.commonOverhangMm;
  const maxLen = Math.max(...list.map((c) => c.overallMm), 1);
  const W = 560;
  const left = 46;
  const barMax = 430;
  const rowH = 32;
  const top = 22;
  const H = top + list.length * rowH + 28;
  const last = list[list.length - 1];
  const tailW = (tail / maxLen) * barMax;
  const xBM = left + tailW;
  const lastBody = ((last?.toBirdsmouthMm ?? 0) / maxLen) * barMax;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-h-[280px]" role="img" aria-label="Creeper incremental lengths">
      {list.map((c, i) => {
        const y = top + i * rowH;
        const bodyW = (c.toBirdsmouthMm / maxLen) * barMax;
        return (
          <g key={c.index}>
            <text
              x={left - 8}
              y={y + 12}
              textAnchor="end"
              fontSize="10"
              fontFamily="IBM Plex Mono, monospace"
              fill="#1c1916"
            >
              C{c.index}
            </text>
            <rect x={left} y={y} width={tailW} height={16} fill="#c4bbab" stroke="#1c1916" strokeWidth="0.8" />
            <rect x={xBM} y={y} width={bodyW} height={16} fill="#8a8376" stroke="#1c1916" strokeWidth="0.8" />
            {i === 0 ? (
              <Dim
                x1={xBM}
                y1={y - 2}
                x2={xBM + bodyW}
                y2={y - 2}
                label={mm(c.toBirdsmouthMm, 1)}
                offset={-10}
              />
            ) : (
              <text
                x={xBM + bodyW + 8}
                y={y + 12}
                fontSize="9"
                fill="#c23b22"
                fontFamily="IBM Plex Mono, monospace"
              >
                + {mm(cd, 1)}
              </text>
            )}
          </g>
        );
      })}
      <text x={left + tailW / 2} y={H - 10} textAnchor="middle" fontSize="9" fill="#6f685c">
        tail {mm(tail)}
      </text>
      <text x={xBM + 8} y={H - 10} fontSize="9" fill="#6f685c">
        BM plumb
      </text>
      <text x={xBM + lastBody} y={H - 10} textAnchor="end" fontSize="9" fill="#c23b22">
        long point of cheek
      </text>
    </svg>
  );
}

function Creeper3D({ inputs, result }: { inputs: RoofInputs; result: RoofResult }) {
  const list = result.creepers;
  const cr: Creeper =
    list[Math.min(list.length - 1, Math.max(0, Math.ceil(list.length / 2) - 1))] ?? {
      index: 1,
      fromCornerMm: inputs.spacingMm,
      toBirdsmouthMm: result.commonToBirdsmouthMm * 0.55,
      overallMm: result.commonOverallMm * 0.55,
      hand: "left",
    };

  const toBM = cr.toBirdsmouthMm;
  const depth = inputs.rafter.depth;
  const breadth = inputs.rafter.breadth;
  const pitchDeg = result.pitchDeg;
  const tanP = Math.tan(result.pitchRad);
  const plumbDeg = result.bevels.plumb;
  const seatDeg = result.bevels.seat;

  const VW = 720;
  const VH = 260;
  const padL = 48;
  const padR = 88;
  const topY = 78;
  const d = 62;
  const sofY = topY + d;
  const body = VW - padL - padR;
  const Ltail = 78;
  const Lbm = body - Ltail;
  const p = 22;
  const pr = Math.max(10, d * tanP);
  const ox = 16;
  const oy = -11;

  const xFas = padL;
  const xBM = padL + Ltail;
  const heelX = xBM + p * tanP;
  const seatBotX = heelX + p / Math.max(0.2, tanP);
  const xLong = padL + Ltail + Lbm;

  const N = {
    fasBot: { x: xFas, y: sofY },
    fasTop: { x: xFas + pr, y: topY },
    bmBot: { x: xBM, y: sofY },
    heel: { x: heelX, y: sofY - p },
    seatBot: { x: seatBotX, y: sofY },
    longBot: { x: xLong, y: sofY },
    longTop: { x: xLong + pr, y: topY },
  };
  const F = (q: Pt) => ({ x: q.x + ox, y: q.y + oy });
  const f = {
    fasBot: F(N.fasBot),
    fasTop: F(N.fasTop),
    longBot: F(N.longBot),
    longTop: F(N.longTop),
  };

  const pts = (arr: Pt[]) => arr.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");
  const nearFace = [N.fasBot, N.bmBot, N.heel, N.seatBot, N.longBot, N.longTop, N.fasTop];
  const topFace = [N.fasTop, N.longTop, f.longTop, f.fasTop];
  const tailEnd = [N.fasBot, f.fasBot, f.fasTop, N.fasTop];
  const cheek = [N.longTop, N.longBot, f.longBot, f.longTop];

  const dimY = 36;
  const dimA = xBM + pr;
  const dimB = f.longTop.x;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 px-3 pt-1">
        <span className="rounded-full bg-background px-2.5 py-0.5 font-mono text-[11px] text-foreground">
          C{cr.index} · {cr.hand} hand
        </span>
        <span className="rounded-full bg-background px-2.5 py-0.5 font-mono text-[11px] text-foreground">
          {depth} × {breadth}
        </span>
        <span className="rounded-full bg-background px-2.5 py-0.5 font-mono text-[11px] text-foreground">
          {deg(pitchDeg)} pitch · {deg(plumbDeg)} plumb / {deg(seatDeg)} level
        </span>
      </div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="pointer-events-none mx-auto h-auto w-full max-h-[280px] overflow-hidden"
        role="img"
        aria-label="Creeper rafter, horizontal, length from birdsmouth to long point"
      >
        <defs>
          <pattern id="timber-face" width="48" height="62" patternUnits="userSpaceOnUse">
            <rect width="48" height="62" fill="#e6d5b8" />
            <path d="M0 10 Q12 12 24 9 T48 11" fill="none" stroke="#c9b48e" strokeWidth="1.1" />
            <path d="M0 22 Q16 20 32 23 T48 21" fill="none" stroke="#d2c09a" strokeWidth="0.9" />
            <path d="M0 34 Q10 36 28 33 T48 35" fill="none" stroke="#c4ae86" strokeWidth="1" />
            <path d="M0 46 Q18 44 30 47 T48 45" fill="none" stroke="#d5c4a2" strokeWidth="0.8" />
            <path d="M0 56 Q14 58 26 55 T48 57" fill="none" stroke="#cbb592" strokeWidth="0.9" />
          </pattern>
          <pattern id="timber-top" width="48" height="16" patternUnits="userSpaceOnUse">
            <rect width="48" height="16" fill="#f0e4cc" />
            <path d="M0 5 Q16 7 32 4 T48 6" fill="none" stroke="#d7c6a4" strokeWidth="0.8" />
            <path d="M0 11 Q12 9 28 12 T48 10" fill="none" stroke="#e0d0b0" strokeWidth="0.7" />
          </pattern>
          <pattern id="creeper-hatch" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#dcc9a6" />
            <path d="M0 8 L8 0" stroke="#c4ae84" strokeWidth="0.9" />
            <path d="M-2 2 L2 -2 M6 10 L10 6" stroke="#c4ae84" strokeWidth="0.9" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={VW} height={VH} fill="#ece7da" />

        <polygon points={pts(topFace)} fill="url(#timber-top)" stroke="#1c1916" strokeWidth="1.2" />
        <polygon points={pts(tailEnd)} fill="#d4c2a0" stroke="#1c1916" strokeWidth="1.2" />
        <polygon points={pts(nearFace)} fill="url(#timber-face)" stroke="#1c1916" strokeWidth="1.35" />
        <polygon points={pts(cheek)} fill="url(#creeper-hatch)" stroke="#1c1916" strokeWidth="1.35" />

        <line x1={dimA} y1={topY} x2={dimA} y2={dimY} stroke="#c23b22" strokeWidth="1.15" strokeDasharray="5 4" />
        <line
          x1={f.longTop.x}
          y1={f.longTop.y}
          x2={dimB}
          y2={dimY}
          stroke="#c23b22"
          strokeWidth="1.15"
          strokeDasharray="5 4"
        />
        <line x1={dimA} y1={dimY} x2={dimB} y2={dimY} stroke="#c23b22" strokeWidth="1.3" />
        <line x1={dimA} y1={dimY - 6} x2={dimA} y2={dimY + 6} stroke="#c23b22" strokeWidth="1.3" />
        <line x1={dimB} y1={dimY - 6} x2={dimB} y2={dimY + 6} stroke="#c23b22" strokeWidth="1.3" />
        <text
          x={(dimA + dimB) / 2}
          y={dimY - 8}
          textAnchor="middle"
          fontSize="13"
          fontFamily="IBM Plex Mono, monospace"
          fill="#c23b22"
          stroke="#ece7da"
          strokeWidth="3.5"
          paintOrder="stroke"
        >
          {mm(toBM, 1)}
        </text>

        <text
          x={(xBM + seatBotX) / 2}
          y={sofY + 22}
          textAnchor="middle"
          fontSize="12"
          fill="#2d4a3c"
          fontFamily="Outfit, sans-serif"
        >
          Birdsmouth
        </text>
        <text
          x={xLong + pr + ox + 8}
          y={topY + d / 2 + 4}
          fontSize="12"
          fontWeight="650"
          fill="#c23b22"
          fontFamily="Outfit, sans-serif"
        >
          Long point
        </text>
      </svg>
      <p className="px-3 pb-2 text-center text-[11px] leading-snug text-muted-foreground">
        C{cr.index} · length is from the birdsmouth plumb to the long point of the cheek
      </p>
    </>
  );
}

export function ChippyHipTip({ result }: { result: RoofResult }) {
  if (result.hipCount === 0) return null;
  const plateIn = result.halfSpanMm;
  const hipBm = result.hipToBirdsmouthMm;
  const hipOh = result.hipOverhangMm;
  return (
    <aside className="rounded-[var(--radius-lg)] border border-accent/35 bg-ok-soft px-4 py-3">
      <p className="flex items-center gap-2 text-[11px] font-medium tracking-[0.16em] text-accent uppercase">
        <Lightbulb className="size-3.5 shrink-0" />
        Chippy’s tip · measure the hip in
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground">
        Don’t cut the hip off the calculator. Stand the ridge and centering rafters first, then
        measure it in.
      </p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm leading-relaxed text-foreground">
        <li>
          From the external corner, measure{" "}
          <span className="font-mono font-medium">{mm(plateIn)}</span> along both plates (half the
          span). Same number on each wall. If they don’t match, the job isn’t square — split the
          difference on the hip.
        </li>
        <li>
          Hook a tape on the <span className="font-medium">outside of the plate at the corner</span>{" "}
          (birdsmouth plumb) and run it to the{" "}
          <span className="font-medium">long point of the ridge cheek</span>. That reading is the
          hip to BM — should be close to <span className="font-mono font-medium">{mm(hipBm, 1)}</span>.
        </li>
        <li>
          Add the eaves run for overall: another{" "}
          <span className="font-mono font-medium">{mm(hipOh, 1)}</span> along the hip. Cut plumb and
          double-cheek at the ridge, seat and plumb at the plate.
        </li>
      </ol>
    </aside>
  );
}

export function HipSetoutView({ inputs, result }: { inputs: RoofInputs; result: RoofResult }) {
  if (result.hipCount === 0) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <p className="font-medium">No hips on this roof</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Switch an end to hip to set out creeper rafters, the common difference and the long-point length.
        </p>
      </div>
    );
  }

  const cd = result.commonDifferenceMm;
  const c1 = result.creepers[0];

  return (
    <div className="flex flex-col gap-5">
      <ChippyHipTip result={result} />
      <div className="px-2 sm:px-3">
        <p className="text-sm leading-relaxed text-foreground">
          Hip set-out for a regular 45° hip. Creepers are spaced at {inputs.spacingMm} mm centres
          from the corner. Each one is a <span className="font-medium">common difference</span> of{" "}
          <span className="font-mono text-sm">{mm(cd, 1)}</span> longer than the last
          {c1 ? (
            <>
              {" "}
              (1st jack = {mm(c1.toBirdsmouthMm, 1)} to BM).
            </>
          ) : null}{" "}
          Working from the centering rafter back to the corner, each is one difference shorter.
          Opposite hand the other side of the hip.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Measure to BM along the top edge, from the <span className="text-foreground">long point of the cheek</span>{" "}
          (before the side cut) to the plumb at the outside of the plate. Hip deduction of{" "}
          {mm(result.hipDeductionMm, 1)} is already taken off. Cheek {result.bevels.sideCut.toFixed(1)}° ·
          saw tilt 45° · plumb {result.bevels.plumb.toFixed(1)}°.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-border/80 bg-[#ece7da] px-1 py-2">
          <p className="px-3 pt-1 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Corner plan
          </p>
          <HipCornerPlan inputs={inputs} result={result} />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border/80 bg-[#ece7da] px-1 py-2">
          <p className="px-3 pt-1 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Incremental lengths
          </p>
          <CreeperPairing result={result} />
        </div>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-border/80 bg-[#ece7da] px-1 py-2">
        <p className="px-3 pt-1 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Creeper — where the length is taken
        </p>
        <Creeper3D inputs={inputs} result={result} />
      </div>
    </div>
  );
}
