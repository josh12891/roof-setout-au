export type LengthUnit = "mm" | "m";

export function parseNum(raw: string): number | null {
  const t = raw.trim().replace(/,/g, "");
  if (t === "" || t === "." || t === "-") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function toMetres(value: number, unit: LengthUnit): number {
  return unit === "mm" ? value / 1000 : value;
}

export function formatM3(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0.000";
  if (n > 0 && n < 0.001) return n.toFixed(4);
  return n.toFixed(3);
}

export function formatMm(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function formatM(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const r = Math.round(n * 1000) / 1000;
  if (Number.isInteger(r)) return String(r);
  return String(r);
}

export function formatLength(metres: number, unit: LengthUnit): string {
  if (unit === "mm") return `${formatMm(metres * 1000)} mm`;
  return `${formatM(metres)} m`;
}

export function formatDeg(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function roundM3Order(n: number): number {
  if (n <= 0) return 0;
  return Math.ceil(n * 5) / 5;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
