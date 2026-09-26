import { AlertTriangle, Check, Copy, Printer } from "lucide-react";
import { useState } from "react";
import { ProSection } from "@/components/pro-section";
import { useUnlock } from "@/components/unlock-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AngleChip, BirdsmouthFigure } from "@/components/roof/roof-diagram";
import { ChippyHipTip } from "@/components/roof/hip-setout";
import { deg, memberLabel, mm, stockLabel } from "@/lib/roof/format";
import type { RoofInputs, RoofResult } from "@/lib/roof/types";

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border px-4 py-4 ${
        accent ? "border-accent/30 bg-ok-soft" : "border-border bg-background"
      }`}
    >
      <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-mono text-2xl leading-none font-medium tabular-nums tracking-tight sm:text-3xl">
        {value}
      </p>
      {sub ? <p className="mt-2 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function ResultsPanel({ inputs, result }: { inputs: RoofInputs; result: RoofResult }) {
  const [copied, setCopied] = useState(false);
  const { isSectionOpen } = useUnlock();
  const hipOpen = isSectionOpen("hip");
  const creeperOpen = isSectionOpen("creeper");
  const junctionOpen = isSectionOpen("junction");
  const b = result.bevels;

  function copyList() {
    const lines = [
      `Roof Setout — ${inputs.lengthMm / 1000} m × ${inputs.widthMm / 1000} m @ ${result.pitchDeg}°`,
      `Ends: ${inputs.leftEnd} / ${inputs.rightEnd} · ${inputs.spacingMm} mm centres · ${inputs.covering}`,
      `Rafter ${memberLabel(inputs.rafter.depth, inputs.rafter.breadth)} · ridge ${memberLabel(inputs.ridge.depth, inputs.ridge.breadth)} · hip ${memberLabel(inputs.hip.depth, inputs.hip.breadth)}`,
      "",
      `Common rafter to birdsmouth: ${mm(result.commonToBirdsmouthMm, 1)}`,
      `Common overall (incl. eaves): ${mm(result.commonOverallMm, 1)}`,
      `Run ${mm(result.commonRunMm, 1)} · rise ${mm(result.riseMm, 1)} · ${mm(result.risePerMetreMm)} per metre`,
      ...(hipOpen
        ? [`Hip to birdsmouth: ${mm(result.hipToBirdsmouthMm, 1)} · overall ${mm(result.hipOverallMm, 1)}`]
        : []),
      ...(junctionOpen
        ? [`Valley to birdsmouth: ${mm(result.valleyToBirdsmouthMm, 1)} · overall ${mm(result.valleyOverallMm, 1)}`]
        : []),
      `Ridge: ${mm(result.ridgeLengthMm)} (${mm(result.ridgeWithOverhangMm)} with gable overhang)`,
      ...(creeperOpen
        ? [
            `Common difference (creepers): ${mm(result.commonDifferenceMm, 1)}`,
            `Hip deduction (half thickness on 45°): ${mm(result.hipDeductionMm, 1)}`,
          ]
        : []),
      "",
      "Bevels",
      `Common plumb ${deg(b.plumb)} · seat ${deg(b.seat)}`,
      ...(hipOpen
        ? [
            `Hip plumb ${deg(b.hipPitch)} · hip cheek ${deg(b.hipSideCut)} · backing ${deg(b.backing)}`,
            `Creeper cheek ${deg(b.sideCut)} · saw bevel ${deg(b.sawBevel, 0)} (regular 45° hip)`,
          ]
        : []),
      "",
      `Birdsmouth seat ${mm(result.birdsmouth.seatMm, 1)} · plumb ${mm(result.birdsmouth.plumbDepthMm, 1)} · max 1/3 = ${mm(result.birdsmouth.maxPlumbMm, 1)}`,
      "",
      ...(creeperOpen
        ? [
            "Cutting list",
            ...result.cuttingList.map(
              (c) =>
                `${c.count}× ${c.name}: ${mm(c.toBirdsmouthMm, 1)} to BM / ${mm(c.overallMm, 1)} overall → ${stockLabel(c.stockMm)} stock · ${c.notes}`,
            ),
            "",
            "Creepers from hip corner (one corner, both hands needed)",
            ...result.creepers.map(
              (c) =>
                `C${c.index} @ ${mm(c.fromCornerMm)} from corner — ${mm(c.toBirdsmouthMm, 1)} to BM / ${mm(c.overallMm, 1)} overall`,
            ),
            "",
          ]
        : ["Cutting list and creeper lengths unlock with Pro.", ""]),
      "Guidance only. Confirm spans with AS 1684.2 / .3 tables for stress grade, roof load and wind class.",
    ];
    void navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Cuts · AS 1684
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyList}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy set-out"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer />
            Print
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat
          accent
          label="Common rafter — cutting length"
          value={mm(result.cuttingCommonMm)}
          sub={`Geometrical ${mm(result.geometricalCommonMm)} (to ridge centre) · half ridge off, square off the plumb · overall with eaves ${mm(result.commonOverallMm)}`}
        />
        <ProSection tool="hip" note>
          <Stat
            label="Hip rafter to birdsmouth"
            value={mm(result.hipToBirdsmouthMm)}
            sub={`Overall ${mm(result.hipOverallMm)} · ${result.hipCount} hips`}
          />
        </ProSection>
        <ProSection tool="junction">
          <Stat
            label="Valley rafter to birdsmouth"
            value={mm(result.valleyToBirdsmouthMm)}
            sub={
              result.valleyCount
                ? `Overall ${mm(result.valleyOverallMm)} · ${result.valleyCount} valley${result.valleyCount === 1 ? "" : "s"}`
                : "Regular valley (equal pitch) — same geometry as the hip. Add an L or T junction to count them."
            }
          />
        </ProSection>
        <Stat
          label="Ridge"
          value={result.pyramid ? "Pyramid" : mm(result.ridgeLengthMm)}
          sub={`With gable overhang ${mm(result.ridgeWithOverhangMm)} · height above plate ${mm(result.ridgeHeightAbovePlateMm)}`}
        />
      </div>

      <ProSection tool="hip" title="Hip tip" detail="Backing and the long-point set-out for the hip.">
        <ChippyHipTip result={result} />
      </ProSection>

      {result.warnings.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
          {result.warnings.map((w) => (
            <p key={w} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{w}</span>
            </p>
          ))}
        </div>
      ) : null}

      <section className="print-break rounded-[var(--radius-xl)] border border-border bg-surface p-5">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h3 className="text-base font-medium">Bevels & saw settings</h3>
          <Badge variant="muted">Regular 45° hip</Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <AngleChip label="Common plumb" value={deg(b.plumb)} hint="Ridge and birdsmouth plumb. Set the square to the pitch." />
          <AngleChip label="Common seat" value={deg(b.seat)} hint="Level cut of the birdsmouth (90° − pitch)." />
        </div>
        <div className="mt-3">
          <ProSection
            tool="hip"
            title="Hip and creeper bevels"
            detail="Hip plumb, cheek, creeper cheek and backing. Common plumb and seat above stay free."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <AngleChip label="Hip plumb" value={deg(b.hipPitch)} hint="Shallower than the common. atan(tan pitch / √2)." />
              <AngleChip label="Hip cheek" value={deg(b.hipSideCut)} hint="Edge bevel at the ridge. Double cheek onto the ridge." />
              <AngleChip
                label="Creeper cheek"
                value={deg(b.sideCut)}
                hint="Jack side cut. Opposite hand each side of the hip. Saw tilt 45° on a circular saw."
              />
              <AngleChip label="Hip backing" value={deg(b.backing)} hint="Plane the top edges of the hip into each roof plane." />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              On a circular saw, keep the bevel at 45° for a regular hip and cut along the hip plumb
              (or the common plumb for creepers). That produces the cheek. Valley cheeks face into the
              trough — same angles, opposite orientation.
            </p>
          </ProSection>
        </div>
      </section>

      <section className="print-break rounded-[var(--radius-xl)] border border-border bg-surface p-5">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h3 className="text-base font-medium">Birdsmouth</h3>
          <Badge variant={result.birdsmouth.ok ? "ok" : "warn"}>
            {result.birdsmouth.ok ? "AS 1684 seat OK" : "Check AS 1684"}
          </Badge>
        </div>
        <BirdsmouthFigure inputs={inputs} result={result} />
        <p className="mt-3 text-sm text-muted-foreground">{result.birdsmouth.note}</p>
      </section>

      <ProSection
        tool="creeper"
        note
        title="Creeper schedule"
        detail="Common difference, hip jacks and the cutting list."
      >
      <section className="print-break rounded-[var(--radius-xl)] border border-border bg-surface p-5">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h3 className="text-base font-medium">Hip jack rafters</h3>
          <Badge variant="muted">
            Common diminish {mm(result.commonDifferenceMm, 1)}
          </Badge>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Lengths from the hip corner, one side. Reduce the geometrical length by {mm(result.hipDeductionMm, 1)}
          (half the {inputs.hip.breadth} mm hip, square off the edge bevel). Cut a left-hand and a
          right-hand cheek at each length. {result.creeperPerHipCorner} jacks per hip × {result.hipCount} hips
          {result.valleyJackCount ? ` · ${result.valleyJackCount} valley jacks` : ""}
          {result.crippleJackCount ? ` · ${result.crippleJackCount} cripple jacks` : ""}.
        </p>
        {result.creepers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hip corners on this roof — gable both ends, so no creepers.
          </p>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                  <th className="py-2 pr-3 font-medium">Mark</th>
                  <th className="py-2 pr-3 font-medium">From corner</th>
                  <th className="py-2 pr-3 font-medium">To birdsmouth</th>
                  <th className="py-2 font-medium">Overall</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {result.creepers.map((c) => (
                  <tr key={c.index} className="border-b border-border/70">
                    <td className="py-2 pr-3">{c.index === 1 ? "1st jack" : c.index === 2 ? "2nd jack" : c.index === 3 ? "3rd jack" : `${c.index}th jack`}</td>
                    <td className="py-2 pr-3">{mm(c.fromCornerMm)}</td>
                    <td className="py-2 pr-3">{mm(c.toBirdsmouthMm, 1)}</td>
                    <td className="py-2">{mm(c.overallMm, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="print-break rounded-[var(--radius-xl)] border border-border bg-surface p-5">
        <h3 className="mb-4 text-base font-medium">Cutting list</h3>
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                <th className="py-2 pr-3 font-medium">Member</th>
                <th className="py-2 pr-3 font-medium">Qty</th>
                <th className="py-2 pr-3 font-medium">To BM</th>
                <th className="py-2 pr-3 font-medium">Overall</th>
                <th className="py-2 font-medium">Stock</th>
              </tr>
            </thead>
            <tbody>
              {result.cuttingList.map((c) => (
                <tr key={c.name} className="border-b border-border/70 align-top">
                  <td className="py-3 pr-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.notes}</div>
                  </td>
                  <td className="py-3 pr-3 font-mono tabular-nums">{c.count || "—"}</td>
                  <td className="py-3 pr-3 font-mono tabular-nums">{c.count ? mm(c.toBirdsmouthMm, 1) : "—"}</td>
                  <td className="py-3 pr-3 font-mono tabular-nums">{c.count ? mm(c.overallMm, 1) : "—"}</td>
                  <td className="py-3 font-mono tabular-nums">{c.count ? stockLabel(c.stockMm) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Stock lengths are the next common Australian size (2.4, 2.7, 3.0, 3.6 … 6.0, 7.2 m) with
          50 mm waste. Counts assume rafters on both pitches at {inputs.spacingMm} mm centres
          along the ridge. Confirm against AS 1684 span tables for {memberLabel(inputs.rafter.depth, inputs.rafter.breadth)}{" "}
          {inputs.covering === "tile" ? "tile" : "sheet"} roof, roof load width and wind classification.
        </p>
      </section>
      </ProSection>
    </div>
  );
}
