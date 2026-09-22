import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { NumberField, Segmented } from "@/components/fields";
import { HipSetoutDiagram } from "@/components/roof/diagrams";
import { UnlockCta } from "@/components/unlock-gate";
import { usePaidToolCommit } from "@/components/use-paid-tool-commit";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateHipValley, type HipValleyKind, type PitchInput } from "@/lib/roof";
import { formatDeg, formatMm, parseNum } from "@/lib/format";

export function HipSetoutTool() {
  const [kind, setKind] = useState<HipValleyKind>("hip");
  const [run, setRun] = useState("4500");
  const [degrees, setDegrees] = useState("22.5");
  const [overhang, setOverhang] = useState("600");
  const [corner, setCorner] = useState("90");

  const pitch: PitchInput | null = useMemo(() => {
    const d = parseNum(degrees);
    if (d == null || d <= 0 || d >= 80) return null;
    return { kind: "degrees", degrees: d };
  }, [degrees]);

  const live = useMemo(() => {
    const runMm = parseNum(run);
    if (pitch == null || runMm == null || runMm <= 0) return null;
    return calculateHipValley({
      kind,
      runMm,
      pitch,
      overhangMm: parseNum(overhang) ?? 0,
      planCornerDegrees: parseNum(corner) ?? 90,
    });
  }, [corner, kind, overhang, pitch, run]);

  const { displayed: result, needsCommit, showUnlockCta, commitError, calculate } =
    usePaidToolCommit("hip", live, (value) => value != null);

  return (
    <AppShell
      title="Hip / valley"
      subtitle="Equal-pitch lengths, backing and side cuts."
      back
    >
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Member</CardTitle>
          <CardDescription>
            Half-span run matches the common rafter run. Square corners default to 90°.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-4">
          <Segmented
            ariaLabel="Hip or valley"
            value={kind}
            onChange={setKind}
            options={[
              { value: "hip", label: "Hip" },
              { value: "valley", label: "Valley" },
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField id="run" label="Half-span run" value={run} onChange={setRun} unit="mm" step={50} />
            <NumberField id="pitch" label="Common pitch" value={degrees} onChange={setDegrees} unit="°" step={0.5} />
            <NumberField id="oh" label="Overhang (horiz.)" value={overhang} onChange={setOverhang} unit="mm" step={10} />
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

      <div className="mb-4 overflow-hidden rounded-xl border border-border bg-surface shadow-sheet">
        <HipSetoutDiagram result={result} />
      </div>

      {result ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              {result.kind === "hip" ? "Hip" : "Valley"} on an equal-pitch roof.
            </CardDescription>
          </CardHeader>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Result item="Plan run" value={`${formatMm(result.planRunMm)} mm`} />
            <Result item="Rise" value={`${formatMm(result.riseMm)} mm`} />
            <Result item="Hip pitch" value={`${formatDeg(result.hipPitchDegrees)}°`} />
            <Result item="Slope length" value={`${formatMm(result.slopeLengthMm)} mm`} />
            <Result item="With overhang" value={`${formatMm(result.totalLengthMm)} mm`} />
            <Result item="Backing" value={`${formatDeg(result.backingDegrees)}°`} />
            <Result item="Side cut" value={`${formatDeg(result.sideCutDegrees)}°`} />
            <Result item="Plumb cut" value={`${formatDeg(result.plumbCutDegrees)}°`} />
            <Result item="Level cut" value={`${formatDeg(result.levelCutDegrees)}°`} />
          </dl>
        </Card>
      ) : null}

      {showUnlockCta ? <UnlockCta afterWin toolLabel="hip / valley calculation" /> : null}
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
