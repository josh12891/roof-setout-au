import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UnlockProvider } from "../../components/unlock-provider.tsx";
import { RoofDiagram } from "../../components/roof/roof-diagram.tsx";
import { calculateRoof, DEFAULT_INPUTS } from "./geometry.ts";
import type { RoofInputs } from "./types.ts";

const ROOF_FILLS = new Set([
  "#6e746b",
  "#646a63",
  "#5c6158",
  "#525850",
  "#4a5048",
  "#585e56",
  "#505650",
]);

function isoSvg(patch: Partial<RoofInputs>) {
  const inputs: RoofInputs = {
    ...DEFAULT_INPUTS,
    ...patch,
    rafter: { ...DEFAULT_INPUTS.rafter },
    ridge: { ...DEFAULT_INPUTS.ridge },
    hip: { ...DEFAULT_INPUTS.hip },
  };
  const html = renderToStaticMarkup(
    createElement(
      UnlockProvider,
      null,
      createElement(RoofDiagram, { inputs, result: calculateRoof(inputs) }),
    ),
  );
  const svg = html.match(/<svg[\s\S]*?<\/svg>/)?.[0];
  if (!svg) throw new Error("isometric svg missing");
  return svg;
}

/** Largest uncovered patch inside the roof silhouette, in isometric square units. */
function largestRoofHole(svg: string, res = 40) {
  const polys: { x: number; y: number }[][] = [];
  for (const tag of svg.match(/<polygon[^>]*>/g) ?? []) {
    const fill = /fill="([^"]+)"/.exec(tag)?.[1];
    if (!fill || !ROOF_FILLS.has(fill)) continue;
    const raw = /points="([^"]+)"/.exec(tag)?.[1] ?? "";
    polys.push(
      raw.split(/\s+/).filter(Boolean).map((pair) => {
        const [x, y] = pair.split(",");
        return { x: Number(x), y: Number(y) };
      }),
    );
  }
  const xs = polys.flatMap((p) => p.map((q) => q.x));
  const ys = polys.flatMap((p) => p.map((q) => q.y));
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.ceil((Math.max(...xs) - minX) / res) + 4;
  const height = Math.ceil((Math.max(...ys) - minY) / res) + 4;
  const grid = new Uint8Array(width * height);
  for (const poly of polys) {
    const pts = poly.map((p) => ({
      x: Math.floor((p.x - minX) / res) + 1,
      y: Math.floor((p.y - minY) / res) + 1,
    }));
    const y0 = Math.max(0, Math.min(...pts.map((p) => p.y)));
    const y1 = Math.min(height - 1, Math.max(...pts.map((p) => p.y)));
    for (let y = y0; y <= y1; y++) {
      const crossings: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        if (a.y === b.y) continue;
        if ((a.y <= y && y < b.y) || (b.y <= y && y < a.y)) {
          const t = (y - a.y) / (b.y - a.y);
          crossings.push(a.x + (b.x - a.x) * t);
        }
      }
      crossings.sort((a, b) => a - b);
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const from = Math.max(0, Math.floor(crossings[i]));
        const to = Math.min(width - 1, Math.floor(crossings[i + 1]));
        for (let x = from; x <= to; x++) grid[y * width + x] = 1;
      }
    }
  }
  const seen = new Uint8Array(width * height);
  const visit = (x: number, y: number, into: number[]) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (seen[i] || grid[i]) return;
    seen[i] = 1;
    into.push(i);
  };
  const edge: number[] = [];
  for (let x = 0; x < width; x++) {
    visit(x, 0, edge);
    visit(x, height - 1, edge);
  }
  for (let y = 0; y < height; y++) {
    visit(0, y, edge);
    visit(width - 1, y, edge);
  }
  while (edge.length) {
    const i = edge.pop() as number;
    const x = i % width;
    const y = (i - x) / width;
    visit(x - 1, y, edge);
    visit(x + 1, y, edge);
    visit(x, y - 1, edge);
    visit(x, y + 1, edge);
  }
  let largest = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (grid[start] || seen[start]) continue;
      const pile = [start];
      seen[start] = 1;
      let count = 0;
      while (pile.length) {
        const j = pile.pop() as number;
        count++;
        const px = j % width;
        const py = (j - px) / width;
        for (const [nx, ny] of [
          [px - 1, py],
          [px + 1, py],
          [px, py - 1],
          [px, py + 1],
        ] as const) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const n = ny * width + nx;
          if (grid[n] || seen[n]) continue;
          seen[n] = 1;
          pile.push(n);
        }
      }
      largest = Math.max(largest, count * res * res);
    }
  }
  return largest;
}

describe("isometric roof faces", () => {
  it("keeps hip and gable slopes filled", () => {
    expect(largestRoofHole(isoSvg({}))).toBe(0);
    expect(largestRoofHole(isoSvg({ leftEnd: "gable", rightEnd: "gable" }))).toBe(0);
    expect(largestRoofHole(isoSvg({ leftEnd: "hip", rightEnd: "gable" }))).toBe(0);
  });

  it("fills L and T slopes, including a narrower wing", () => {
    // A missing valley or hip cheek is millions of square units. Seams stay small.
    const limit = 120_000;
    const cases: Partial<RoofInputs>[] = [
      { junction: "L" },
      { junction: "T" },
      { junction: "L", wingSpanMm: 5000, wingProjectionMm: 4500 },
      { junction: "T", wingSpanMm: 5000, wingProjectionMm: 4500 },
      { junction: "T", wingEnd: "gable" },
      { junction: "L", wingEnd: "gable" },
    ];
    for (const patch of cases) {
      expect(largestRoofHole(isoSvg(patch))).toBeLessThan(limit);
    }
  });
});
