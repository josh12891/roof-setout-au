import type { CommonRafterResult, HipValleyResult } from "@/lib/roof";

/** Simple elevation of a common rafter with birdsmouth call-out. */
export function CommonRafterDiagram({
  result,
}: {
  result: CommonRafterResult | null;
}) {
  const pitch = result?.pitchDegrees ?? 22.5;
  const rad = (pitch * Math.PI) / 180;
  const run = 160;
  const rise = run * Math.tan(rad);
  const x0 = 28;
  const yPlate = 150;
  const ridgeX = x0 + run;
  const ridgeY = yPlate - rise;
  const overhang = 36;
  const endX = x0 - overhang;
  const endY = yPlate + overhang * Math.tan(rad);

  return (
    <svg viewBox="0 0 280 180" className="h-auto w-full text-ink" role="img" aria-label="Common rafter diagram">
      <rect x="0" y="0" width="280" height="180" fill="var(--color-surface-2)" rx="8" />
      {/* Plate */}
      <rect x={x0 - 8} y={yPlate} width="24" height="10" fill="var(--color-primary)" opacity="0.85" />
      {/* Rafter */}
      <path
        d={`M ${endX} ${endY} L ${ridgeX} ${ridgeY}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Birdsmouth notch hint */}
      <path
        d={`M ${x0 - 6} ${yPlate} L ${x0 + 10} ${yPlate} L ${x0 + 10} ${yPlate - 12}`}
        fill="none"
        stroke="var(--color-warn)"
        strokeWidth="2"
      />
      {/* Ridge plumb */}
      <path
        d={`M ${ridgeX} ${ridgeY} V ${yPlate + 10}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeDasharray="4 3"
        opacity="0.5"
      />
      <text x="14" y="24" className="fill-muted" fontSize="11" fontFamily="var(--font-sans)">
        Plumb {result ? `${result.plumbCutDegrees.toFixed(1)}°` : "—"}
      </text>
      <text x="170" y="24" className="fill-muted" fontSize="11" fontFamily="var(--font-sans)">
        Level {result ? `${result.levelCutDegrees.toFixed(1)}°` : "—"}
      </text>
      <text x="14" y="172" className="fill-subtle" fontSize="10" fontFamily="var(--font-sans)">
        Birdsmouth seat on plate
      </text>
    </svg>
  );
}

/** Plan view of a square hip with creeper stubs. */
export function HipSetoutDiagram({
  result,
}: {
  result: HipValleyResult | null;
}) {
  return (
    <svg viewBox="0 0 280 200" className="h-auto w-full text-ink" role="img" aria-label="Hip set-out plan">
      <rect x="0" y="0" width="280" height="200" fill="var(--color-surface-2)" rx="8" />
      {/* Wall plate rectangle */}
      <path
        d="M 40 40 H 240 V 160 H 40 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Ridge */}
      <path d="M 100 40 V 160" fill="none" stroke="currentColor" strokeWidth="2" />
      {/* Hips */}
      <path d="M 40 40 L 100 100" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" />
      <path d="M 40 160 L 100 100" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" />
      <path d="M 240 40 L 180 100" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" opacity="0.35" />
      <path d="M 240 160 L 180 100" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" opacity="0.35" />
      {/* Commons */}
      <path d="M 40 70 H 100" fill="none" stroke="currentColor" strokeWidth="1.25" opacity="0.55" />
      <path d="M 40 100 H 100" fill="none" stroke="currentColor" strokeWidth="1.25" opacity="0.55" />
      <path d="M 40 130 H 100" fill="none" stroke="currentColor" strokeWidth="1.25" opacity="0.55" />
      {/* Creepers */}
      <path d="M 55 55 L 78 78" fill="none" stroke="var(--color-warn)" strokeWidth="1.5" />
      <path d="M 70 48 L 88 66" fill="none" stroke="var(--color-warn)" strokeWidth="1.5" />
      <text x="14" y="24" className="fill-muted" fontSize="11" fontFamily="var(--font-sans)">
        {result ? `${result.kind === "hip" ? "Hip" : "Valley"} pitch ${result.hipPitchDegrees.toFixed(1)}°` : "Hip plan"}
      </text>
      <text x="14" y="188" className="fill-subtle" fontSize="10" fontFamily="var(--font-sans)">
        Equal pitch · square corner
      </text>
    </svg>
  );
}
