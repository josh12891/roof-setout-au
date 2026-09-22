import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { NumberField, Segmented } from "@/components/fields";
import { UnlockCta } from "@/components/unlock-gate";
import { usePaidToolCommit } from "@/components/use-paid-tool-commit";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calculateJunction,
  type JunctionKind,
  type LtPlanShape,
  type PitchInput,
} from "@/lib/roof";
import { formatDeg, formatMm, parseNum } from "@/lib/format";

export function LtJunctionTool() {
  const [planShape, setPlanShape] = useState<LtPlanShape>("L");
  const [junctionKind, setJunctionKind] = useState<JunctionKind>("equal-hip");
  const [run, setRun] = useState("4500");
  const [degrees, setDegrees] = useState("22.5");
  const [secDegrees, setSecDegrees] = useState("25");
  const [corner, setCorner] = useState("90");

  const pitch: PitchInput | null = useMemo(() => {
    const d = parseNum(degrees);
    if (d == null || d <= 0 || d >= 80) return null;
    return { kind: "degrees", degrees: d };
  }, [degrees]);

  const live = useMemo(() => {
    const runMm = parseNum(run);
    if (pitch == null || runMm == null || runMm <= 0) return null;
    const sec = parseNum(secDegrees);
    return calculateJunction({
      kind: junctionKind,
      planShape,
      mainPitch: pitch,
      secondaryPitch:
        junctionKind === "unequal-pitch" && sec != null && sec > 0
          ? { kind: "degrees", degrees: sec }
          : undefined,
      mainRunMm: runMm,
      secondaryRunMm: runMm,
      planCornerDegrees: parseNum(corner) ?? 90,
    });
  }, [corner, degrees, junctionKind, pitch, planShape, run, secDegrees]);

  const { displayed: result, needsCommit, showUnlockCta, commitError, calculate } =
    usePaidToolCommit("junction", live, (value) => value != null);

  return (
    <AppShell
      title="L / T junctions"
      subtitle="Plan hips and valleys where wings join the main run."
      back
    >
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Junction</CardTitle>
          <CardDescription>
            Equal-pitch hip or valley, or unequal pitches at an L or T plan join.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1.5 text-sm font-medium">Plan shape</p>
            <Segmented
              ariaLabel="Plan shape"
              value={planShape}
              onChange={setPlanShape}
              options={[
                { value: "L", label: "L" },
                { value: "T", label: "T" },
              ]}
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Member</p>
            <Segmented
              ariaLabel="Junction kind"
              value={junctionKind}
              onChange={setJunctionKind}
              options={[
                { value: "equal-hip", label: "Eq. hip" },
                { value: "equal-valley", label: "Eq. valley" },
                { value: "unequal-pitch", label: "Unequal" },
              ]}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField id="run" label="Half-span run" value={run} onChange={setRun} unit="mm" step={50} />
            <NumberField id="pitch" label="Main pitch" value={degrees} onChange={setDegrees} unit="°" step={0.5} />
            {junctionKind === "unequal-pitch" ? (
              <NumberField
                id="sec"
                label="Secondary pitch"
                value={secDegrees}
                onChange={setSecDegrees}
                unit="°"
                step={0.5}
              />
            ) : null}
            <NumberField id="corner" label="Plan corner" value={corner} onChange={setCorner} unit="°" step={1} />
          </div>
          {needsCommit ? (
            <Button type="button" size="lg" onClick={() => calculate("Enter run and pitch first.")}>
              Calculate
            </Button>
          ) : null}
          {commitError ? <p className="text-sm text-danger">{commitError}</p> : null}
        </div>
      </Card>

      {result ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>
              {result.planShape} · {result.kind.replace("-", " ")}
            </CardTitle>
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

      {showUnlockCta ? <UnlockCta afterWin toolLabel="L/T junction calculation" /> : null}
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
