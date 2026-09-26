import type { ReactNode } from "react";
import { useMemo } from "react";
import { Link } from "react-router";
import { RotateCcw } from "lucide-react";
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
import { MEMBER_PRESETS, rafterStations } from "@/lib/roof/geometry";
import { calculateFlatRoof, FLAT_SPAN_TABLE_NOTE } from "@/lib/roof/flat";
import { memberLabel, metres, mm, stockLabel } from "@/lib/roof/format";
import type { Member } from "@/lib/roof/types";
import { selectFlatInputs, useFlatRoofStore } from "@/store/flat-roof-store";
import { useShallow } from "zustand/react/shallow";

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

function FlatPlan({
  lengthMm,
  spanMm,
  overhangMm,
  spacingMm,
}: {
  lengthMm: number;
  spanMm: number;
  overhangMm: number;
  spacingMm: number;
}) {
  const stations = rafterStations(0, lengthMm, spacingMm);
  const totalSpan = spanMm + overhangMm * 2;
  const vbW = 360;
  const vbH = 200;
  const pad = 16;
  const drawW = vbW - pad * 2;
  const drawH = vbH - pad * 2;
  const scaleX = lengthMm > 0 ? drawW / lengthMm : 1;
  const scaleY = totalSpan > 0 ? drawH / totalSpan : 1;
  const plateY = pad + overhangMm * scaleY;
  const plateH = spanMm * scaleY;

  return (
    <figure className="rounded-[var(--radius-xl)] border border-border bg-surface p-4">
      <figcaption className="mb-3 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
        Plan — rafters across the span
      </figcaption>
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="h-auto w-full text-timber"
        role="img"
        aria-label="Plan of flat rafters spanning between the plates, with eaves past each plate"
      >
        <rect
          x={pad}
          y={plateY}
          width={drawW}
          height={Math.max(plateH, 1)}
          fill="var(--color-surface-2)"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        {stations.map((station) => {
          const x = pad + station * scaleX;
          return (
            <line
              key={station}
              x1={x}
              y1={pad}
              x2={x}
              y2={pad + drawH}
              stroke="currentColor"
              strokeWidth="1.25"
            />
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">
        Lines are the rafters. The box is the plates. The stick runs past the plates by the eaves
        each side. Spacing {spacingMm} mm along {metres(lengthMm)}.
      </p>
    </figure>
  );
}

export function FlatRoofPage() {
  const inputs = useFlatRoofStore(useShallow(selectFlatInputs));
  const setLength = useFlatRoofStore((s) => s.setLength);
  const setSpan = useFlatRoofStore((s) => s.setSpan);
  const setOverhang = useFlatRoofStore((s) => s.setOverhang);
  const setSpacing = useFlatRoofStore((s) => s.setSpacing);
  const setRafter = useFlatRoofStore((s) => s.setRafter);
  const reset = useFlatRoofStore((s) => s.reset);
  const result = useMemo(() => calculateFlatRoof(inputs), [inputs]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-accent uppercase">
              Australian carpentry · Flat roof
            </p>
            <h1 className="mt-1 font-sans text-3xl font-medium tracking-tight sm:text-4xl">
              Flat roof
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Level rafters only. Length, span, centres and eaves. No hips, valleys or creepers.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs no-print">
            <Link to="/" className="font-medium text-accent underline-offset-2 hover:underline">
              Flat or pitched
            </Link>
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
                <h2 className="text-lg font-medium tracking-tight">Rafters</h2>
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
            <Field label="Rafter span" hint="outside of plates, metres">
              <MetreField
                id="flat-span"
                label="Rafter span in metres"
                mm={inputs.spanMm}
                onMm={setSpan}
              />
            </Field>
            <Field label="Eaves each side" hint="past the plate, mm">
              <MmField id="flat-overhang" value={inputs.overhangMm} onChange={setOverhang} />
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
              lengthMm={inputs.lengthMm}
              spanMm={inputs.spanMm}
              overhangMm={inputs.overhangMm}
              spacingMm={inputs.spacingMm}
            />
            <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 sm:p-6">
              <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Order
              </p>
              <h2 className="mt-1 text-lg font-medium tracking-tight">Rafter lengths</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--radius-lg)] border border-accent/30 bg-ok-soft px-4 py-4">
                  <dt className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    Rafter overall
                  </dt>
                  <dd className="mt-1 font-mono text-2xl leading-none font-medium tabular-nums">
                    {mm(result.rafterOverallMm, 1)}
                  </dd>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Span {mm(result.spanMm, 1)} plus eaves {mm(result.overhangEachSideMm, 1)} each
                    side.
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
                    rafters — {mm(result.rafterOverallMm, 1)} overall → {stockLabel(result.stockMm)}{" "}
                    stock.
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
