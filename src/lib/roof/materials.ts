/**
 * AU metric stock lengths for rafter / creeper order rollups.
 * Prefer the shortest stock that covers the cut (+ kerf allowance).
 */
export const DEFAULT_STOCK_LENGTHS_MM = [
  2400, 2700, 3000, 3600, 4200, 4800, 5400, 6000,
] as const;

/** Default saw kerf / trim allowance when picking stock, mm. */
export const DEFAULT_KERF_MM = 5;

export type CuttingLine = {
  /** Display label, e.g. "Creeper 1". */
  label: string;
  /** Finished cut length along the timber, mm. */
  lengthMm: number;
  /** Chosen stock length, mm. */
  stockMm: number;
  /** Offcut left on that stick after the cut (+ kerf), mm. */
  wasteMm: number;
};

export type MaterialOrderLine = {
  stockMm: number;
  quantity: number;
};

export type MaterialOrderSummary = {
  lines: CuttingLine[];
  order: MaterialOrderLine[];
  /** Total linear metres ordered (stock × qty). */
  totalStockMm: number;
  /** Sum of finished cut lengths. */
  totalCutMm: number;
};

export function pickStockLength(
  lengthMm: number,
  stocks: readonly number[] = DEFAULT_STOCK_LENGTHS_MM,
  kerfMm = DEFAULT_KERF_MM,
): { stockMm: number; wasteMm: number } {
  const need = Math.max(0, lengthMm) + Math.max(0, kerfMm);
  const sorted = [...stocks].filter((s) => Number.isFinite(s) && s > 0).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { stockMm: Math.ceil(need), wasteMm: 0 };
  }
  const fit = sorted.find((s) => s >= need);
  if (fit != null) {
    return { stockMm: fit, wasteMm: fit - need };
  }
  const longest = sorted[sorted.length - 1]!;
  return { stockMm: longest, wasteMm: longest - need };
}

export function buildCuttingLines(
  members: { label: string; lengthMm: number }[],
  stocks: readonly number[] = DEFAULT_STOCK_LENGTHS_MM,
  kerfMm = DEFAULT_KERF_MM,
): CuttingLine[] {
  return members.map((m) => {
    const { stockMm, wasteMm } = pickStockLength(m.lengthMm, stocks, kerfMm);
    return {
      label: m.label,
      lengthMm: m.lengthMm,
      stockMm,
      wasteMm,
    };
  });
}

/** Aggregate sticks by stock length for a job-level material order. */
export function rollupMaterialOrder(lines: CuttingLine[]): MaterialOrderLine[] {
  const counts = new Map<number, number>();
  for (const line of lines) {
    counts.set(line.stockMm, (counts.get(line.stockMm) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([stockMm, quantity]) => ({ stockMm, quantity }));
}

export function summarizeMaterialOrder(
  members: { label: string; lengthMm: number }[],
  stocks: readonly number[] = DEFAULT_STOCK_LENGTHS_MM,
  kerfMm = DEFAULT_KERF_MM,
): MaterialOrderSummary {
  const lines = buildCuttingLines(members, stocks, kerfMm);
  const order = rollupMaterialOrder(lines);
  return {
    lines,
    order,
    totalStockMm: order.reduce((sum, row) => sum + row.stockMm * row.quantity, 0),
    totalCutMm: lines.reduce((sum, row) => sum + row.lengthMm, 0),
  };
}
