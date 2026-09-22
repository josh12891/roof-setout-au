import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { NumberField, Segmented } from "@/components/fields";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateGableEnds, type PitchInput } from "@/lib/roof";
import { formatDeg, formatMm, parseNum } from "@/lib/format";

type PitchMode = "degrees" | "rise-run";

export function GableEndsTool() {
  const [span, setSpan] = useState("9000");
  const [length, setLength] = useState("12000");
  const [pitchMode, setPitchMode] = useState<PitchMode>("degrees");
  const [degrees, setDegrees] = useState("22.5");
  const [rise, setRise] = useState("1");
  const [runUnit, setRunUnit] = useState("2");
  const [barge, setBarge] = useState("450");

  const pitch: PitchInput | null = useMemo(() => {
    if (pitchMode === "degrees") {
      const d = parseNum(degrees);
      if (d == null || d <= 0 || d >= 80) return null;
      return { kind: "degrees", degrees: d };
    }
    const r = parseNum(rise);
    const run = parseNum(runUnit);
    if (r == null || run == null || run <= 0) return null;
    return { kind: "rise-run", rise: r, run };
  }, [degrees, pitchMode, rise, runUnit]);

  const result = useMemo(() => {
    const spanMm = parseNum(span);
    const lengthMm = parseNum(length);
    if (pitch == null || spanMm == null || spanMm <= 0 || lengthMm == null || lengthMm <= 0) {
      return null;
    }
    return calculateGableEnds({
      spanMm,
      lengthMm,
      pitch,
      bargeOverhangMm: parseNum(barge) ?? 0,
    });
  }, [barge, length, pitch, span]);

  return (
    <AppShell
      title="Gable ends"
      subtitle="Rise, ridge and barge — free forever."
      back
    >
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>
            Rectangular gable. Span is wall-plate to wall-plate; length runs with the ridge.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField id="span" label="Building span" value={span} onChange={setSpan} unit="mm" step={50} />
            <NumberField
              id="length"
              label="Building length"
              value={length}
              onChange={setLength}
              unit="mm"
              step={50}
              hint="Along the ridge"
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Pitch</p>
            <Segmented
              ariaLabel="Pitch mode"
              value={pitchMode}
              onChange={setPitchMode}
              options={[
                { value: "degrees", label: "Degrees" },
                { value: "rise-run", label: "Rise : run" },
              ]}
            />
          </div>
          {pitchMode === "degrees" ? (
            <NumberField
              id="pitch-deg"
              label="Pitch"
              value={degrees}
              onChange={setDegrees}
              unit="°"
              step={0.5}
              min={0}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField id="rise" label="Rise" value={rise} onChange={setRise} step={1} min={0} />
              <NumberField id="run" label="Run" value={runUnit} onChange={setRunUnit} step={1} min={1} />
            </div>
          )}
          <NumberField
            id="barge"
            label="Barge overhang (horizontal)"
            value={barge}
            onChange={setBarge}
            unit="mm"
            step={10}
          />
        </div>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Results</CardTitle>
              <Badge variant="ok">Free</Badge>
            </div>
            <CardDescription>Gable triangle and ridge / barge call-outs.</CardDescription>
          </CardHeader>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Result item="Pitch" value={`${formatDeg(result.pitchDegrees)}°`} />
            <Result item="Rise / 300" value={formatMm(result.risePer300)} />
            <Result item="Half-span run" value={`${formatMm(result.runMm)} mm`} />
            <Result item="Rise" value={`${formatMm(result.riseMm)} mm`} />
            <Result item="Common slope" value={`${formatMm(result.commonSlopeMm)} mm`} />
            <Result item="Ridge length" value={`${formatMm(result.ridgeLengthMm)} mm`} />
            <Result item="Barge / rake" value={`${formatMm(result.bargeLengthMm)} mm`} />
            <Result item="Plumb cut" value={`${formatDeg(result.plumbCutDegrees)}°`} />
            <Result item="Level cut" value={`${formatDeg(result.levelCutDegrees)}°`} />
          </dl>
        </Card>
      ) : (
        <p className="text-sm text-muted">Enter span, length and pitch to see lengths.</p>
      )}
    </AppShell>
  );
}

function Result({ item, value }: { item: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <dt className="text-xs text-muted">{item}</dt>
      <dd className="font-display text-lg font-semibold text-ink">{value}</dd>
    </div>
  );
}
