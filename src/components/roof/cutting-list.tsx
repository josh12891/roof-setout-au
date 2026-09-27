import { memberLabel, mm, stockLabel } from "@/lib/roof/format";
import type { MemberCut, RoofInputs, RoofResult } from "@/lib/roof/types";

function CuttingTable({ title, rows }: { title?: string; rows: MemberCut[] }) {
  return (
    <div>
      {title ? <h4 className="mb-2 text-sm font-medium">{title}</h4> : null}
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
            {rows.map((c) => (
              <tr key={`${c.section}-${c.name}`} className="border-b border-border/70 align-top">
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
    </div>
  );
}

export function CuttingList({ inputs, result }: { inputs: RoofInputs; result: RoofResult }) {
  const mainCuts = result.cuttingList.filter((c) => c.section !== "wing");
  const wingCuts = result.cuttingList.filter((c) => c.section === "wing");
  const splitCuts = inputs.junction !== "none" && wingCuts.length > 0;
  const wingTitle =
    inputs.junction === "T" ? "T-shape wing roof members" : "L-shape wing roof members";

  return (
    <section className="print-break" data-section="cutting-list">
      <h3 className="mb-4 text-base font-medium">Cutting list</h3>
      {splitCuts ? (
        <div className="flex flex-col gap-6">
          <CuttingTable title="Main roof members" rows={mainCuts} />
          <CuttingTable title={wingTitle} rows={wingCuts} />
        </div>
      ) : (
        <CuttingTable rows={result.cuttingList} />
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Stock lengths are the next common Australian size (2.4, 2.7, 3.0, 3.6 … 6.0, 7.2 m) with
        50 mm waste. Counts assume rafters on both pitches at {inputs.spacingMm} mm centres
        along the ridge. Confirm against AS 1684 span tables for {memberLabel(inputs.rafter.depth, inputs.rafter.breadth)}{" "}
        {inputs.covering === "tile" ? "tile" : "sheet"} roof, roof load width and wind classification.
      </p>
    </section>
  );
}
