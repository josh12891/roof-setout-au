import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { NumberField, Segmented } from "@/components/fields";
import { UnlockCta } from "@/components/unlock-gate";
import { usePaidToolCommit } from "@/components/use-paid-tool-commit";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calculateJunction,
  calculateSkillion,
  type JunctionKind,
  type PitchInput,
} from "@/lib/roof";
import { formatDeg, formatMm, parseNum } from "@/lib/format";

type Mode = "skillion" | "junction";

export function SkillionTool() {
  const [mode, setMode] = useState<Mode>("skillion");
  const [run, setRun] = useState("3600");
  const [degrees, setDegrees] = useState("15");
  const [ohLow, setOhLow] = useState("450");
  const [ohHigh, setOhHigh] = useState("150");
  const [seat, setSeat] = useState("70");
  const [depth, setDepth] = useState("140");
  const [plateStep, setPlateStep] = useState("0");
  const [junctionKind, setJunctionKind] = useState<JunctionKind>("skillion-to-pitch");
  const [secDegrees, setSecDegrees] = useState("25");
  const [corner, setCorner] = useState("90");

  const pitch: PitchInput | null = useMemo(() => {
    const d = parseNum(degrees);
    if (d == null || d <= 0 || d >= 80) return null;
    return { kind: "degrees", degrees: d };
  }, [degrees]);

  const liveSkillion = useMemo(() => {
    if (mode !== "skillion") return null;
    const runMm = parseNum(run);
    if (pitch == null || runMm == null || runMm <= 0) return null;
    return calculateSkillion({
      runMm,
      pitch,
      overhangLowMm: parseNum(ohLow) ?? 0,
      overhangHighMm: parseNum(ohHigh) ?? 0,
      plateStepMm: parseNum(plateStep) ?? 0,
      birdsmouth: {
        seatMm: parseNum(seat) ?? 0,
        rafterDepthMm: parseNum(depth) ?? 0,
      },
    });
  }, [depth, mode, ohHigh, ohLow, pitch, plateStep, run, seat]);

  const liveJunction = useMemo(() => {
    if (mode !== "junction") return null;
    const runMm = parseNum(run);
    if (pitch == null || runMm == null || runMm <= 0) return null;
    const sec = parseNum(secDegrees);
    return calculateJunction({
      kind: junctionKind,
      mainPitch: pitch,
      secondaryPitch:
        sec != null && sec > 0 ? { kind: "degrees", degrees: sec } : undefined,
      mainRunMm: runMm,
      secondaryRunMm: runMm,
      planCornerDegrees: parseNum(corner) ?? 90,
    });
  }, [corner, junctionKind, mode, pitch, run, secDegrees]);

  const live = mode === "skillion" ? liveSkillion : liveJunction;

  const { displayed: result, needsCommit, showUnlockCta, commitError, calculate } =
    usePaidToolCommit("skillion", live, (value) => value != null);

  return (
    <AppShell
      title="Skillion / junctions"
      subtitle="Lean-to lengths and advanced roof junctions."
      back
    >
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Mode</CardTitle>
          <CardDescription>Skillion rafter, or hip/valley / unequal junctions.</CardDescription>
        </CardHeader>
        <Segmented
          ariaLabel="Mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "skillion", label: "Skillion" },
            { value: "junction", label: "Junction" },
          ]}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <NumberField id="run" label="Run" value={run} onChange={setRun} unit="mm" step={50} />
          <NumberField id="pitch" label="Main pitch" value={degrees} onChange={setDegrees} unit="°" step={0.5} />
          {mode === "skillion" ? (
            <>
              <NumberField id="oh-low" label="Low overhang" value={ohLow} onChange={setOhLow} unit="mm" step={10} />
              <NumberField id="oh-high" label="High overhang" value={ohHigh} onChange={setOhHigh} unit="mm" step={10} />
              <NumberField id="seat" label="Birdsmouth seat" value={seat} onChange={setSeat} unit="mm" step={5} />
              <NumberField id="depth" label="Rafter depth" value={depth} onChange={setDepth} unit="mm" step={5} />
              <NumberField
                id="step"
                label="Plate step"
                value={plateStep}
                onChange={setPlateStep}
                unit="mm"
                step={10}
                hint="Bulkhead / higher plate"
              />
            </>
          ) : (
            <>
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-sm font-medium">Junction</p>
                <Segmented
                  ariaLabel="Junction kind"
                  value={junctionKind}
                  onChange={setJunctionKind}
                  options={[
                    { value: "equal-hip", label: "Eq. hip" },
                    { value: "equal-valley", label: "Eq. valley" },
                    { value: "skillion-to-pitch", label: "Skillion" },
                    { value: "unequal-pitch", label: "Unequal" },
                  ]}
                />
              </div>
              <NumberField
                id="sec"
                label="Secondary pitch"
                value={secDegrees}
                onChange={setSecDegrees}
                unit="°"
                step={0.5}
              />
              <NumberField id="corner" label="Plan corner" value={corner} onChange={setCorner} unit="°" step={1} />
            </>
          )}
        </div>
        {needsCommit ? (
          <Button
            type="button"
            size="lg"
            className="mt-4 w-full"
            onClick={() => calculate("Enter run and pitch first.")}
          >
            Calculate
          </Button>
        ) : null}
        {commitError ? <p className="mt-2 text-sm text-danger">{commitError}</p> : null}
      </Card>

      {result && "slopeLengthMm" in result ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Skillion results</CardTitle>
          </CardHeader>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Result item="Pitch" value={`${formatDeg(result.pitchDegrees)}°`} />
            <Result item="Rise" value={`${formatMm(result.riseMm)} mm`} />
            <Result item="Slope" value={`${formatMm(result.slopeLengthMm)} mm`} />
            <Result item="Total length" value={`${formatMm(result.totalLengthMm)} mm`} />
            <Result item="Low end ht" value={`${formatMm(result.lowEndHeightMm)} mm`} />
            <Result item="High end ht" value={`${formatMm(result.highEndHeightMm)} mm`} />
            <Result item="Heel" value={`${formatMm(result.birdsmouth.heelMm)} mm`} />
            <Result item="Left above seat" value={`${formatMm(result.birdsmouth.remainingDepthMm)} mm`} />
          </dl>
        </Card>
      ) : null}

      {result && "junctionPitchDegrees" in result ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Junction results</CardTitle>
            <CardDescription>{result.notes[0]}</CardDescription>
          </CardHeader>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Result item="Main pitch" value={`${formatDeg(result.mainPitchDegrees)}°`} />
            <Result
              item="Secondary"
              value={
                result.secondaryPitchDegrees == null
                  ? "—"
                  : `${formatDeg(result.secondaryPitchDegrees)}°`
              }
            />
            <Result item="Plan angle" value={`${formatDeg(result.bisectPlanDegrees)}°`} />
            <Result item="Junction pitch" value={`${formatDeg(result.junctionPitchDegrees)}°`} />
            <Result item="Plan run" value={`${formatMm(result.planRunMm)} mm`} />
            <Result item="Length factor" value={formatMm(result.slopeLengthFactor)} />
          </dl>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
            {result.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {showUnlockCta ? <UnlockCta afterWin toolLabel="skillion / junction calculation" /> : null}
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
