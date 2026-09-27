import type { ReactNode } from "react";
import { useMemo } from "react";
import { Link } from "react-router";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { MetreField, MmField } from "@/components/roof/metre-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MEMBER_PRESETS, PITCH_PRESETS, rafterStations } from "@/lib/roof/geometry";
import { calculateFlatRoof, FLAT_SPAN_TABLE_NOTE } from "@/lib/roof/flat";
import { memberLabel, metres, mm, stockLabel } from "@/lib/roof/format";
import type { Member } from "@/lib/roof/types";
import { selectFlatInputs, useFlatRoofStore } from "@/store/flat-roof-store";
import { useShallow } from "zustand/react/shallow";

const FLAT_PITCH_PRESETS = [0, 5, 10, ...PITCH_PRESETS];

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label>{label}</Label>
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function MemberSelect({
  value,
  onChange,
}: {
  value: Member;
  onChange: (m: Member) => void;
}) {
  const key = `${value.depth}x${value.breadth}`;
  const known = MEMBER_PRESETS.some((p) => p.depth === value.depth && p.breadth === value.breadth);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0 flex-1">
        <Select
          value={known ? key : "custom"}
          onValueChange={(v) => {
            if (v === "custom") return;
            const [d, b] = v.split("x").map(Number);
            onChange({ depth: d, breadth: b });
          }}
        >
          <SelectTrigger aria-label="Rafter size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEMBER_PRESETS.map((p) => (
              <SelectItem key={p.label} value={`${p.depth}x${p.breadth}`}>
                {p.label}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Input
        aria-label="Depth millimetres"
        className="w-16 shrink-0 font-mono"
        inputMode="numeric"
        value={value.depth}
        onChange={(e) => onChange({ ...value, depth: Math.max(35, Number(e.target.value) || 0) })}
      />
      <span className="shrink-0 text-muted-foreground">×</span>
      <Input
        aria-label="Breadth millimetres"
        className="w-16 shrink-0 font-mono"
        inputMode="numeric"
        value={value.breadth}
        onChange={(e) => onChange({ ...value, breadth: Math.max(19, Number(e.target.value) || 0) })}
      />
    </div>
  );
}

function BackToChoice() {
  return (
    <Button asChild variant="outline" size="sm" className="no-print">
      <Link to="/" aria-label="Back to roof choice">
        <ArrowLeft />
        Back
      </Link>
    </Button>
  );
}

type Pt = { x: number; y: number };

function isoProject(x: number, y: number, z: number): Pt {
  return {
    x: (x - y) * Math.cos(Math.PI / 6),
    y: (x + y) * Math.sin(Math.PI / 6) - z,
  };
}

function poly(pts: Pt[]): string {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function line(a: Pt, b: Pt): string {
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

function bounds(pts: Pt[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, w: 100, h: 100 };
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const pad = Math.max(160, (w + h) * 0.05);
  return { minX: minX - pad, minY: minY - pad, w: w + pad * 2, h: h + pad * 2 };
}

function FlatPlan({
  lengthMm,
  widthMm,
  overhangMm,
  pitchDeg,
  spacingMm,
}: {
  lengthMm: number;
  widthMm: number;
  overhangMm: number;
  pitchDeg: number;
  spacingMm: number;
}) {
  const stations = rafterStations(0, lengthMm, spacingMm);
  const runMm = widthMm + overhangMm * 2;
  const vbW = 360;
  const vbH = 250;
  const pad = 36;
  const drawW = vbW - pad * 2;
  const drawH = vbH - pad * 2;
  const scale = Math.min(
    drawW / Math.max(lengthMm, 1),
    drawH / Math.max(runMm, 1),
  );
  const drawnL = lengthMm * scale;
  const drawnRun = runMm * scale;
  const originX = pad + (drawW - drawnL) / 2;
  const originY = pad + (drawH - drawnRun) / 2;
  const plateY = originY + overhangMm * scale;
  const plateH = widthMm * scale;
  const sloped = pitchDeg > 0.05;
  const fallX = originX + drawnL * 0.72;

  return (
    <figure className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface">
      <figcaption className="px-4 pt-4 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
        2D plan — one plane
      </figcaption>
      <div className="bg-[#ece7da] px-2 py-3">
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          className="h-auto w-full text-timber"
          role="img"
          aria-label="2D plan of one roof plane. Rafters run the building width. Centres run along the length."
        >
          <defs>
            <marker id="flat-fall" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="#2d4a3c" />
            </marker>
          </defs>
          <rect
            x={originX}
            y={plateY}
            width={Math.max(drawnL, 1)}
            height={Math.max(plateH, 1)}
            fill="#faf7f0"
            stroke="currentColor"
            strokeWidth="1.25"
          />
          {stations.map((station) => {
            const x = originX + station * scale;
            return (
              <line
                key={station}
                x1={x}
                y1={originY}
                x2={x}
                y2={originY + drawnRun}
                stroke="currentColor"
                strokeWidth="1.25"
              />
            );
          })}
          {sloped && plateH > 28 ? (
            <line
              x1={fallX}
              y1={plateY + 8}
              x2={fallX}
              y2={plateY + plateH - 8}
              stroke="#2d4a3c"
              strokeWidth="1.5"
              markerEnd="url(#flat-fall)"
            />
          ) : null}
          {sloped ? (
            <text
              x={vbW / 2}
              y={Math.max(12, originY - 6)}
              textAnchor="middle"
              fill="#2d4a3c"
              fontSize="11"
              fontFamily="Outfit, sans-serif"
            >
              high
            </text>
          ) : null}
          {sloped ? (
            <text
              x={vbW / 2}
              y={Math.min(vbH - 6, originY + drawnRun + 14)}
              textAnchor="middle"
              fill="#2d4a3c"
              fontSize="11"
              fontFamily="Outfit, sans-serif"
            >
              low
            </text>
          ) : null}
        </svg>
      </div>
      <p className="px-4 pt-2 pb-4 text-xs text-muted-foreground">
        {metres(lengthMm)} long × {metres(widthMm)} wide. Lines are the rafters, running the width.
        The box is the plates. Eaves {mm(overhangMm, 0)} past each plate. Centres {spacingMm} mm
        along the length.
        {sloped
          ? " Fall runs down the plan, from the high edge to the low edge."
          : " Level plane — rafter length equals this plan run until you set a pitch."}
      </p>
    </figure>
  );
}

function FlatIso({
  lengthMm,
  widthMm,
  overhangMm,
  pitchDeg,
  spacingMm,
}: {
  lengthMm: number;
  widthMm: number;
  overhangMm: number;
  pitchDeg: number;
  spacingMm: number;
}) {
  const drawing = useMemo(() => {
    const L = Math.max(lengthMm, 1);
    const W = Math.max(widthMm, 1);
    const O = Math.max(0, overhangMm);
    const pitchRad = (Math.min(60, Math.max(0, pitchDeg)) * Math.PI) / 180;
    const wall = 2400;
    // x = 0 is the high plate. Fall is toward +x so the isometric puts the high edge up on the left.
    const zAt = (x: number) => wall + (W - x) * Math.tan(pitchRad);
    const P = (x: number, y: number, z: number) => isoProject(x, y, z);
    const zHigh = zAt(0);
    const zLow = zAt(W);
    const ground = [P(0, 0, 0), P(W, 0, 0), P(W, L, 0), P(0, L, 0)];
    const farWall = [P(0, L, 0), P(W, L, 0), P(W, L, zLow), P(0, L, zHigh)];
    const highWall = [P(0, 0, 0), P(0, L, 0), P(0, L, zHigh), P(0, 0, zHigh)];
    const lowWall = [P(W, 0, 0), P(W, L, 0), P(W, L, zLow), P(W, 0, zLow)];
    const nearWall = [P(0, 0, 0), P(W, 0, 0), P(W, 0, zLow), P(0, 0, zHigh)];
    const roof = [P(-O, 0, zAt(-O)), P(W + O, 0, zAt(W + O)), P(W + O, L, zAt(W + O)), P(-O, L, zAt(-O))];
    const rafters = rafterStations(0, L, spacingMm).map((y) =>
      line(P(-O, y, zAt(-O)), P(W + O, y, zAt(W + O))),
    );
    const eaves = [
      line(roof[0], roof[1]),
      line(roof[1], roof[2]),
      line(roof[2], roof[3]),
      line(roof[3], roof[0]),
    ];
    const vb = bounds([...ground, ...farWall, ...lowWall, ...highWall, ...nearWall, ...roof]);
    const stroke = Math.max(W, L, 1000) * 0.007;
    return { ground, farWall, lowWall, highWall, nearWall, roof, rafters, eaves, vb, stroke };
  }, [lengthMm, widthMm, overhangMm, pitchDeg, spacingMm]);

  return (
    <figure className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface">
      <figcaption className="px-4 pt-4 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
        Isometric — one plane
      </figcaption>
      <div className="bg-[#ece7da] px-2 py-3">
        <svg
          viewBox={`${drawing.vb.minX} ${drawing.vb.minY} ${drawing.vb.w} ${drawing.vb.h}`}
          className="mx-auto h-auto max-h-[420px] w-full"
          role="img"
          aria-label="Isometric of one roof plane. The sheet slopes with the pitch. No hips, valleys or wings."
        >
          <polygon points={poly(drawing.ground)} fill="#d8d1c0" opacity="0.55" />
          <polygon points={poly(drawing.farWall)} fill="#b7ae9e" />
          <polygon points={poly(drawing.highWall)} fill="#ddd6c6" />
          <polygon points={poly(drawing.lowWall)} fill="#c4bbab" />
          <polygon points={poly(drawing.nearWall)} fill="#cfc6b4" />
          <polygon points={poly(drawing.roof)} fill="#5c6158" />
          {drawing.rafters.map((d) => (
            <path
              key={d}
              d={d}
              stroke="#ece7dc"
              strokeWidth={drawing.stroke * 0.55}
              opacity="0.85"
              fill="none"
            />
          ))}
          {drawing.eaves.map((d) => (
            <path key={d} d={d} stroke="#1c1916" strokeWidth={drawing.stroke} fill="none" />
          ))}
        </svg>
      </div>
      <p className="px-4 pt-2 pb-4 text-xs text-muted-foreground">
        One sheet. Rafters run from the high edge to the low edge
        {pitchDeg > 0.05
          ? ` at ${pitchDeg}°. High edge on the left, fall to the right.`
          : ". Set a pitch to raise the high edge."}{" "}
        No hips, valleys or wings.
      </p>
    </figure>
  );
}

export function FlatRoofPage() {
  const inputs = useFlatRoofStore(useShallow(selectFlatInputs));
  const setLength = useFlatRoofStore((s) => s.setLength);
  const setWidth = useFlatRoofStore((s) => s.setWidth);
  const setOverhang = useFlatRoofStore((s) => s.setOverhang);
  const setPitch = useFlatRoofStore((s) => s.setPitch);
  const setSpacing = useFlatRoofStore((s) => s.setSpacing);
  const setRafter = useFlatRoofStore((s) => s.setRafter);
  const reset = useFlatRoofStore((s) => s.reset);
  const result = useMemo(() => calculateFlatRoof(inputs), [inputs]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <div className="mb-3">
              <BackToChoice />
            </div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-accent uppercase">
              Australian carpentry · Flat roof
            </p>
            <h1 className="mt-1 font-sans text-3xl font-medium tracking-tight sm:text-4xl">
              Flat roof
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              One plane. It can sit level or on a pitch. Length, width and pitch in — rafter length
              is worked out from the plan. No hips, valleys or wings.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs no-print">
            <Link to="/about" className="font-medium text-accent underline-offset-2 hover:underline">
              About
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
        <aside
          role="note"
          className="rounded-[var(--radius-lg)] border border-warn/40 bg-warn-soft px-4 py-4"
        >
          <p className="text-sm font-medium text-warn">Check the span tables</p>
          <p className="mt-1 text-sm text-foreground">
            Rafter span on this job: {metres(result.spanMm)}. {FLAT_SPAN_TABLE_NOTE}
          </p>
        </aside>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <aside className="flex min-w-0 flex-col gap-6 rounded-[var(--radius-xl)] border border-border bg-surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  Set-out
                </p>
                <h2 className="text-lg font-medium tracking-tight">One plane</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} className="no-print">
                <RotateCcw />
                Reset
              </Button>
            </div>

            <Field label="Length" hint="rafters spaced along this, metres">
              <MetreField
                id="flat-length"
                label="Building length in metres"
                mm={inputs.lengthMm}
                onMm={setLength}
              />
            </Field>
            <Field label="Width" hint="plan span, outside of plates, metres">
              <MetreField
                id="flat-width"
                label="Building width in metres"
                mm={inputs.widthMm}
                onMm={setWidth}
              />
            </Field>
            <Field label="Eaves each side" hint="past the plate, mm">
              <MmField id="flat-overhang" value={inputs.overhangMm} onChange={setOverhang} />
            </Field>
            <Field label="Pitch" hint="degrees, one plane">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={45}
                    step={0.5}
                    value={inputs.pitchDeg}
                    onChange={(e) => setPitch(Number(e.target.value))}
                    className="h-11 w-full accent-accent"
                    aria-label="Pitch in degrees"
                  />
                  <MmField id="flat-pitch" value={inputs.pitchDeg} onChange={setPitch} min={0} className="w-20" />
                </div>
                <div className="flex flex-wrap gap-1">
                  {FLAT_PITCH_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPitch(p)}
                      className={`h-9 rounded-[var(--radius-sm)] px-2.5 font-mono text-xs ${
                        inputs.pitchDeg === p
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-2 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p}°
                    </button>
                  ))}
                </div>
              </div>
            </Field>
            <Field label="Rafter length" hint="calculated, along the slope">
              <output
                aria-label="Calculated rafter length"
                className="flex h-11 w-full items-center rounded-[var(--radius-sm)] border border-accent/40 bg-ok-soft px-3 font-mono text-sm tabular-nums"
              >
                {mm(result.rafterOverallMm, 1)}
              </output>
              <p className="text-xs text-muted-foreground">
                Plan run {mm(result.planRunMm, 1)} at {result.pitchDeg}°. Not typed.
              </p>
            </Field>
            <Field label="Rafter spacing">
              <ToggleGroup
                type="single"
                value={String(inputs.spacingMm)}
                onValueChange={(v) => {
                  if (v === "450" || v === "600") setSpacing(Number(v) as 450 | 600);
                }}
              >
                <ToggleGroupItem value="450">450 mm</ToggleGroupItem>
                <ToggleGroupItem value="600">600 mm</ToggleGroupItem>
              </ToggleGroup>
            </Field>
            <Field label="Rafters" hint="depth × breadth, mm">
              <MemberSelect value={inputs.rafter} onChange={setRafter} />
            </Field>
          </aside>

          <div className="flex min-w-0 flex-col gap-6">
            <FlatPlan
              lengthMm={result.lengthMm}
              widthMm={result.widthMm}
              overhangMm={result.overhangEachSideMm}
              pitchDeg={result.pitchDeg}
              spacingMm={result.spacingMm}
            />
            <FlatIso
              lengthMm={result.lengthMm}
              widthMm={result.widthMm}
              overhangMm={result.overhangEachSideMm}
              pitchDeg={result.pitchDeg}
              spacingMm={result.spacingMm}
            />
            <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 sm:p-6">
              <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Order
              </p>
              <h2 className="mt-1 text-lg font-medium tracking-tight">Rafter lengths</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--radius-lg)] border border-accent/30 bg-ok-soft px-4 py-4">
                  <dt className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    Rafter length
                  </dt>
                  <dd className="mt-1 font-mono text-2xl leading-none font-medium tabular-nums">
                    {mm(result.rafterOverallMm, 1)}
                  </dd>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Calculated from the plan. Run {mm(result.planRunMm, 1)} (width {mm(result.widthMm, 1)}{" "}
                    plus eaves {mm(result.overhangEachSideMm, 1)} each side) at {result.pitchDeg}°. Rise{" "}
                    {mm(result.riseMm, 1)} over the width.
                  </p>
                </div>
                <div className="rounded-[var(--radius-lg)] border border-border bg-background px-4 py-4">
                  <dt className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    How many
                  </dt>
                  <dd className="mt-1 font-mono text-2xl leading-none font-medium tabular-nums">
                    {result.rafterCount}
                  </dd>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {result.spacingMm} mm centres.
                    {result.lastBayMm === result.spacingMm
                      ? " Last bay is a full centre."
                      : ` Last bay ${mm(result.lastBayMm, 1)} — shorter than the centres.`}
                  </p>
                </div>
                <div className="rounded-[var(--radius-lg)] border border-border bg-background px-4 py-4 sm:col-span-2">
                  <dt className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    Cutting list
                  </dt>
                  <dd className="mt-1 text-sm">
                    {result.rafterCount}× {memberLabel(inputs.rafter.depth, inputs.rafter.breadth)}{" "}
                    rafters — {mm(result.rafterOverallMm, 1)} overall at {result.pitchDeg}° →{" "}
                    {stockLabel(result.stockMm)} stock.
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">{result.spanNote}</p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
