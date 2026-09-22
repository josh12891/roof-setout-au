import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { NumberField } from "@/components/fields";
import { UnlockCta } from "@/components/unlock-gate";
import { usePaidToolCommit } from "@/components/use-paid-tool-commit";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateCreepers, type PitchInput } from "@/lib/roof";
import { formatMm, parseNum } from "@/lib/format";

export function CreeperTool() {
  const [run, setRun] = useState("4500");
  const [degrees, setDegrees] = useState("22.5");
  const [centres, setCentres] = useState("600");
  const [firstOffset, setFirstOffset] = useState("600");
  const [overhang, setOverhang] = useState("450");
  const [hipThickness, setHipThickness] = useState("45");

  const pitch: PitchInput | null = useMemo(() => {
    const d = parseNum(degrees);
    if (d == null || d <= 0 || d >= 80) return null;
    return { kind: "degrees", degrees: d };
  }, [degrees]);

  const live = useMemo(() => {
    const runMm = parseNum(run);
    const centresMm = parseNum(centres);
    if (pitch == null || runMm == null || runMm <= 0 || centresMm == null || centresMm <= 0) {
      return null;
    }
    return calculateCreepers({
      runMm,
      pitch,
      centresMm,
      firstOffsetMm: parseNum(firstOffset) ?? centresMm,
      overhangMm: parseNum(overhang) ?? 0,
      hipThicknessMm: parseNum(hipThickness) ?? 0,
    });
  }, [centres, degrees, firstOffset, hipThickness, overhang, pitch, run]);

  const { displayed: result, needsCommit, showUnlockCta, commitError, calculate } =
    usePaidToolCommit("creeper", live, (value) => value != null && value.count > 0);

  return (
    <AppShell
      title="Creepers"
      subtitle="Jack reductions and plate marks along the hip."
      back
    >
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Set-out</CardTitle>
          <CardDescription>
            Centres along the wall plate. First offset is usually one bay in from the corner.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField id="run" label="Half-span run" value={run} onChange={setRun} unit="mm" step={50} />
          <NumberField id="pitch" label="Common pitch" value={degrees} onChange={setDegrees} unit="°" step={0.5} />
          <NumberField id="centres" label="Centres" value={centres} onChange={setCentres} unit="mm" step={10} />
          <NumberField
            id="first"
            label="First offset"
            value={firstOffset}
            onChange={setFirstOffset}
            unit="mm"
            step={10}
          />
          <NumberField id="oh" label="Overhang" value={overhang} onChange={setOverhang} unit="mm" step={10} />
          <NumberField
            id="hip-th"
            label="Hip thickness"
            value={hipThickness}
            onChange={setHipThickness}
            unit="mm"
            step={5}
            hint="Allows half thickness at the cheek"
          />
        </div>
        {needsCommit ? (
          <Button
            type="button"
            size="lg"
            className="mt-4 w-full"
            onClick={() => calculate("Enter run, pitch and centres first.")}
          >
            Calculate
          </Button>
        ) : null}
        {commitError ? <p className="mt-2 text-sm text-danger">{commitError}</p> : null}
      </Card>

      {result ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{result.count} creepers</CardTitle>
            <CardDescription>
              Slope reduction per bay ≈ {formatMm(result.reductionPerBayMm)} mm.
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">Plate mark</th>
                  <th className="py-2 pr-3 font-medium">Remain. run</th>
                  <th className="py-2 pr-3 font-medium">Slope</th>
                  <th className="py-2 font-medium">+ overhang</th>
                </tr>
              </thead>
              <tbody>
                {result.members.map((m) => (
                  <tr key={m.index} className="border-b border-border/70">
                    <td className="py-2 pr-3 font-display font-semibold">{m.index}</td>
                    <td className="py-2 pr-3">{formatMm(m.plateMarkMm)} mm</td>
                    <td className="py-2 pr-3">{formatMm(m.remainingRunMm)} mm</td>
                    <td className="py-2 pr-3">{formatMm(m.slopeLengthMm)} mm</td>
                    <td className="py-2">{formatMm(m.totalLengthMm)} mm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {showUnlockCta ? <UnlockCta afterWin toolLabel="creeper set-out" /> : null}
    </AppShell>
  );
}
