import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
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
import { MEMBER_PRESETS, PITCH_PRESETS } from "@/lib/roof/geometry";
import type { Member } from "@/lib/roof/types";
import { MetreField, MmField } from "@/components/roof/metre-field";
import { useRoofStore } from "@/store/roof-store";

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
  id,
  value,
  onChange,
}: {
  id: string;
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
          <SelectTrigger id={id} aria-label="Member size">
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

export function InputsPanel() {
  const s = useRoofStore();

  return (
    <aside className="flex min-w-0 flex-col gap-6 rounded-[var(--radius-xl)] border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Set-out
          </p>
          <h2 className="text-lg font-medium tracking-tight">Building & members</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={s.reset} className="no-print">
          <RotateCcw />
          Reset
        </Button>
      </div>

      <Field label="Length" hint="along the ridge, metres">
        <MetreField id="length" label="Building length in metres" mm={s.lengthMm} onMm={s.setLength} />
      </Field>
      <Field label="Width / span" hint="outside of plates, metres">
        <MetreField id="width" label="Building width in metres" mm={s.widthMm} onMm={s.setWidth} />
      </Field>
      <Field label="Eaves overhang" hint="horizontal, mm">
        <MmField id="overhang" value={s.overhangMm} onChange={s.setOverhang} />
      </Field>

      <Field label="Pitch" hint="degrees">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={45}
              step={0.5}
              value={s.pitchDeg}
              onChange={(e) => s.setPitch(Number(e.target.value))}
              className="h-11 w-full accent-accent"
              aria-label="Pitch in degrees"
            />
            <MmField value={s.pitchDeg} onChange={s.setPitch} min={5} className="w-20" />
          </div>
          <div className="flex flex-wrap gap-1">
            {PITCH_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => s.setPitch(p)}
                className={`h-9 rounded-[var(--radius-sm)] px-2.5 font-mono text-xs ${
                  s.pitchDeg === p
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Left end">
          <ToggleGroup
            type="single"
            value={s.leftEnd}
            onValueChange={(v) => {
              if (v === "hip" || v === "gable") s.setLeftEnd(v);
            }}
          >
            <ToggleGroupItem value="hip">Hip</ToggleGroupItem>
            <ToggleGroupItem value="gable">Gable</ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <Field label="Right end">
          <ToggleGroup
            type="single"
            value={s.rightEnd}
            onValueChange={(v) => {
              if (v === "hip" || v === "gable") s.setRightEnd(v);
            }}
          >
            <ToggleGroupItem value="hip">Hip</ToggleGroupItem>
            <ToggleGroupItem value="gable">Gable</ToggleGroupItem>
          </ToggleGroup>
        </Field>
      </div>

      <Field label="Intersecting roof" hint="valleys">
        <ToggleGroup
          type="single"
          value={s.junction}
          onValueChange={(v) => {
            if (v === "none" || v === "L" || v === "T") s.setJunction(v);
          }}
        >
          <ToggleGroupItem value="none">None</ToggleGroupItem>
          <ToggleGroupItem value="L">L-shape</ToggleGroupItem>
          <ToggleGroupItem value="T">T-shape</ToggleGroupItem>
        </ToggleGroup>
      </Field>

      {s.junction !== "none" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Wing span" hint="metres">
              <MetreField mm={s.wingSpanMm} onMm={s.setWingSpan} />
            </Field>
            <Field label="Wing projection" hint="metres">
              <MetreField mm={s.wingProjectionMm} onMm={s.setWingProjection} />
            </Field>
          </div>
          <Field label="Wing end" hint="outer end of the offset">
            <ToggleGroup
              type="single"
              value={s.wingEnd}
              onValueChange={(v) => {
                if (v === "hip" || v === "gable") s.setWingEnd(v);
              }}
            >
              <ToggleGroupItem value="hip">Hip</ToggleGroupItem>
              <ToggleGroupItem value="gable">Gable</ToggleGroupItem>
            </ToggleGroup>
          </Field>
        </>
      ) : null}

      <Field label="Rafter spacing">
        <ToggleGroup
          type="single"
          value={String(s.spacingMm)}
          onValueChange={(v) => {
            if (v === "450" || v === "600") s.setSpacing(Number(v) as 450 | 600);
          }}
        >
          <ToggleGroupItem value="450">450 mm</ToggleGroupItem>
          <ToggleGroupItem value="600">600 mm</ToggleGroupItem>
        </ToggleGroup>
      </Field>

      <Field label="Roof covering" hint="AS 1684 load">
        <ToggleGroup
          type="single"
          value={s.covering}
          onValueChange={(v) => {
            if (v === "sheet" || v === "tile") s.setCovering(v);
          }}
        >
          <ToggleGroupItem value="sheet">Sheet</ToggleGroupItem>
          <ToggleGroupItem value="tile">Tile</ToggleGroupItem>
        </ToggleGroup>
      </Field>

      <Field label="Rafters" hint="depth × breadth, mm">
        <MemberSelect id="rafter" value={s.rafter} onChange={s.setRafter} />
      </Field>
      <Field label="Ridge" hint="depth × breadth, mm">
        <MemberSelect id="ridge" value={s.ridge} onChange={s.setRidge} />
      </Field>
      <Field label="Hip / valley" hint="depth × breadth, mm">
        <MemberSelect id="hip" value={s.hip} onChange={s.setHip} />
      </Field>
      <Field label="Wall plate width" hint="birdsmouth seat, mm">
        <ToggleGroup
          type="single"
          value={String(s.plateWidthMm)}
          onValueChange={(v) => {
            if (v) s.setPlateWidth(Number(v));
          }}
        >
          <ToggleGroupItem value="70">70 mm</ToggleGroupItem>
          <ToggleGroupItem value="90">90 mm</ToggleGroupItem>
          <ToggleGroupItem value="140">140 mm</ToggleGroupItem>
        </ToggleGroup>
      </Field>
    </aside>
  );
}
