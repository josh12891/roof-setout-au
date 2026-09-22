import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { NumberField, Segmented } from "@/components/fields";
import { CommonRafterDiagram } from "@/components/roof/diagrams";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateCommonRafter, type PitchInput } from "@/lib/roof";
import { formatDeg, formatMm, parseNum } from "@/lib/format";

type PitchMode = "degrees" | "rise-run";

export function CommonRafterTool() {
  const [span, setSpan] = useState("9000");
  const [pitchMode, setPitchMode] = useState<PitchMode>("degrees");
  const [degrees, setDegrees] = useState("22.5");
  const [rise, setRise] = useState("1");
  const [runUnit, setRunUnit] = useState("2");
  const [overhang, setOverhang] = useState("600");
  const [seat, setSeat] = useState("90");
  const [depth, setDepth] = useState("190");

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
    if (pitch == null || spanMm == null || spanMm <= 0) return null;
    return calculateCommonRafter({
      spanMm,
      pitch,
      overhangMm: parseNum(overhang) ?? 0,
      birdsmouth: {
        seatMm: parseNum(seat) ?? 0,
        rafterDepthMm: parseNum(depth) ?? 0,
      },
    });
  }, [depth, overhang, pitch, seat, span]);

  return (
    <AppShell
      title="Common rafter"
      subtitle="Pitch, slope length and birdsmouth — free forever."
      back
    >
      <Card className="mb-4 animate-in">
        <CardHeader>
          <CardTitle>Span and pitch</CardTitle>
          <CardDescription>
            Full span wall-plate to wall-plate. Pitch in degrees or rise:run.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-4">
          <NumberField
            id="span"
            label="Building span"
            value={span}
            onChange={setSpan}
            unit="mm"
            step={50}
            hint="Outside of plate to outside of plate"
          />
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
            id="overhang"
            label="Overhang (horizontal)"
            value={overhang}
            onChange={setOverhang}
            unit="mm"
            step={10}
          />
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Birdsmouth</CardTitle>
          <CardDescription>Seat on the plate and rafter depth.</CardDescription>
        </CardHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField id="seat" label="Seat (level cut)" value={seat} onChange={setSeat} unit="mm" step={5} />
          <NumberField id="depth" label="Rafter depth" value={depth} onChange={setDepth} unit="mm" step={5} />
        </div>
      </Card>

      <div className="mb-4 overflow-hidden rounded-xl border border-border bg-surface shadow-sheet">
        <CommonRafterDiagram result={result} />
      </div>

      {result ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Results</CardTitle>
              <Badge>Free</Badge>
              {result.birdsmouth.overcut ? <Badge variant="danger">Overcut</Badge> : null}
            </div>
            <CardDescription>Tape call-outs for the pattern rafter.</CardDescription>
          </CardHeader>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Result item="Pitch" value={`${formatDeg(result.pitchDegrees)}°`} />
            <Result item="Rise / 300" value={formatMm(result.risePer300)} />
            <Result item="Half-span run" value={`${formatMm(result.runMm)} mm`} />
            <Result item="Rise" value={`${formatMm(result.riseMm)} mm`} />
            <Result item="Slope to ridge" value={`${formatMm(result.slopeLengthMm)} mm`} />
            <Result item="Total with overhang" value={`${formatMm(result.totalLengthMm)} mm`} />
            <Result item="Plumb cut" value={`${formatDeg(result.plumbCutDegrees)}°`} />
            <Result item="Level cut" value={`${formatDeg(result.levelCutDegrees)}°`} />
            <Result item="Birdsmouth seat" value={`${formatMm(result.birdsmouth.seatMm)} mm`} />
            <Result item="Heel height" value={`${formatMm(result.birdsmouth.heelMm)} mm`} />
            <Result item="Plumb of seat" value={`${formatMm(result.birdsmouth.plumbMm)} mm`} />
            <Result
              item="Left above seat"
              value={`${formatMm(result.birdsmouth.remainingDepthMm)} mm`}
            />
          </dl>
        </Card>
      ) : (
        <p className="text-sm text-muted">Enter a span and pitch to see lengths.</p>
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
