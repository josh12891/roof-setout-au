import { describe, expect, it } from "vitest";
import {
  DEFAULT_STOCK_LENGTHS_MM,
  pickStockLength,
  rollupMaterialOrder,
  summarizeMaterialOrder,
} from "./materials";

describe("material order rollup", () => {
  it("picks the shortest stock that covers the cut + kerf", () => {
    expect(pickStockLength(2900).stockMm).toBe(3000);
    expect(pickStockLength(3000).stockMm).toBe(3600); // 3000 + 5 kerf needs next
    expect(pickStockLength(2390).stockMm).toBe(2400);
  });

  it("aggregates a job-level order from cutting lines", () => {
    const summary = summarizeMaterialOrder([
      { label: "Creeper 1", lengthMm: 4100 },
      { label: "Creeper 2", lengthMm: 3450 },
      { label: "Creeper 3", lengthMm: 2800 },
      { label: "Creeper 4", lengthMm: 2800 },
    ]);

    expect(summary.lines).toHaveLength(4);
    expect(summary.lines[0]?.stockMm).toBe(4200);
    expect(summary.lines[2]?.stockMm).toBe(3000);
    expect(summary.order).toEqual([
      { stockMm: 3000, quantity: 2 },
      { stockMm: 3600, quantity: 1 },
      { stockMm: 4200, quantity: 1 },
    ]);
    expect(summary.totalCutMm).toBe(4100 + 3450 + 2800 + 2800);
    expect(summary.totalStockMm).toBe(3000 * 2 + 3600 + 4200);
  });

  it("exposes the default AU stock ladder", () => {
    expect(DEFAULT_STOCK_LENGTHS_MM[0]).toBe(2400);
    expect(DEFAULT_STOCK_LENGTHS_MM).toContain(6000);
  });

  it("rollups empty cutting lists to an empty order", () => {
    expect(rollupMaterialOrder([])).toEqual([]);
  });
});
