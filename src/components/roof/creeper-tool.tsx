import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { NumberField } from "@/components/fields";
import { UnlockCta } from "@/components/unlock-gate";
import { usePaidToolCommit } from "@/components/use-paid-tool-commit";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calculateCreepers,
  summarizeMaterialOrder,
  type PitchInput,
} from "@/lib/roof";
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

  const materials = useMemo(() => {
    if (!result || result.count === 0) return null;
    return summarizeMaterialOrder(
      result.members.map((m) => ({
        label: `Creeper ${m.index}`,
        lengthMm: m.totalLengthMm,
      })),
    );
  }, [result]);

  return (
    <AppShell
      title="Creeper schedule"
      subtitle="Common difference, plate marks and material order."
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
        <>
          {/* Hero Pro result — common difference / incremental decrease */}
          <div
            className="mb-4 rounded-xl border-2 border-primary bg-primary px-5 py-6 text-primary-fg shadow-sheet"
            role="status"
            aria-label="Common difference"
          >
            <p className="font-display text-xs font-semibold uppercase tracking-display opacity-90">
              Common difference
            </p>
            <p className="mt-1 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {formatMm(result.commonDifferenceMm)}{" "}
              <span className="text-2xl font-medium opacity-90">mm</span>
            </p>
            <p className="mt-2 text-sm opacity-90">
              Incremental decrease per bay on the slope (centres ÷ cos pitch). Use this to step
              the creeper pattern.
            </p>
          </div>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Creeper schedule</CardTitle>
              <CardDescription>
                {result.count} creepers · plate marks and cutting lengths.
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
                    <th className="py-2 font-medium">Cut length</th>
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

          {materials ? (
            <>
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Cutting list</CardTitle>
                  <CardDescription>
                    Per-creeper stock pick (shortest stick that covers the cut + kerf).
                  </CardDescription>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[24rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted">
                        <th className="py-2 pr-3 font-medium">Member</th>
                        <th className="py-2 pr-3 font-medium">Cut</th>
                        <th className="py-2 pr-3 font-medium">Stock</th>
                        <th className="py-2 font-medium">Offcut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.lines.map((line) => (
                        <tr key={line.label} className="border-b border-border/70">
                          <td className="py-2 pr-3 font-display font-semibold">{line.label}</td>
                          <td className="py-2 pr-3">{formatMm(line.lengthMm)} mm</td>
                          <td className="py-2 pr-3">{formatMm(line.stockMm)} mm</td>
                          <td className="py-2">{formatMm(line.wasteMm)} mm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Material order</CardTitle>
                  <CardDescription>
                    Job-level rollup — how many of each stock length to order.
                  </CardDescription>
                </CardHeader>
                <ul className="mb-4 flex flex-col gap-2">
                  {materials.order.map((row) => (
                    <li
                      key={row.stockMm}
                      className="flex items-baseline justify-between gap-3 rounded-lg bg-surface-2 px-3 py-3"
                    >
                      <span className="text-sm text-muted">{formatMm(row.stockMm)} mm stock</span>
                      <span className="font-display text-2xl font-semibold text-ink">
                        × {row.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-border px-3 py-2">
                    <dt className="text-xs text-muted">Total cut</dt>
                    <dd className="font-display text-lg font-semibold">
                      {formatMm(materials.totalCutMm)} mm
                    </dd>
                  </div>
                  <div className="rounded-lg border border-border px-3 py-2">
                    <dt className="text-xs text-muted">Total stock ordered</dt>
                    <dd className="font-display text-lg font-semibold">
                      {formatMm(materials.totalStockMm)} mm
                    </dd>
                  </div>
                </dl>
              </Card>
            </>
          ) : null}
        </>
      ) : null}

      {showUnlockCta ? <UnlockCta afterWin toolLabel="creeper schedule" /> : null}
    </AppShell>
  );
}
