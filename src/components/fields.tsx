import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { parseNum } from "@/lib/format";

export function NumberField({
  id,
  label,
  value,
  onChange,
  unit,
  step = 1,
  min = 0,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  step?: number;
  min?: number;
  hint?: string;
}) {
  const bump = (dir: 1 | -1) => {
    const n = parseNum(value) ?? 0;
    const next = Math.max(min, Math.round((n + dir * step) * 1000) / 1000);
    onChange(String(next));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => bump(-1)}
          className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-ink transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          <Minus className="size-4" />
        </button>
        <div className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-border bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30">
          <Input
            id={id}
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            className="h-12 min-w-0 flex-1 rounded-none border-0 text-lg shadow-none focus-visible:ring-0"
            placeholder="0"
          />
          {unit ? (
            <span className="flex shrink-0 items-center border-l border-border px-2.5 text-sm text-muted">
              {unit}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => bump(1)}
          className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-ink transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          <Plus className="size-4" />
        </button>
      </div>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex rounded-lg bg-surface-2 p-1"
    >
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-10 min-h-10 flex-1 rounded-md px-3 text-sm font-medium transition-[background-color,color,transform] duration-150 ease-out",
              on
                ? "bg-primary text-primary-fg shadow-sm"
                : "text-muted hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
