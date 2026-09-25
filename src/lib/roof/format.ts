export function mm(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  const v = digits === 0 ? Math.round(n) : Math.round(n * 10 ** digits) / 10 ** digits;
  return `${v.toLocaleString("en-AU")} mm`;
}

export function metres(mmValue: number, digits = 2): string {
  if (!Number.isFinite(mmValue)) return "—";
  return `${(mmValue / 1000).toFixed(digits)} m`;
}

export function deg(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}°`;
}

export function memberLabel(depth: number, breadth: number): string {
  return `${depth} × ${breadth}`;
}

export function stockLabel(mmValue: number): string {
  if (!mmValue) return "—";
  const m = mmValue / 1000;
  return Number.isInteger(m) ? `${m.toFixed(1)} m` : `${m.toFixed(1)} m`;
}

export function parseBuilding(value: string): number | null {
  const t = value.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Values ≥ 80 are treated as millimetres; smaller as metres.
  return n >= 80 ? n : n * 1000;
}

export function buildingDisplay(mmValue: number): string {
  const m = mmValue / 1000;
  return Number.isInteger(m * 10) ? String(m) : m.toFixed(2);
}
