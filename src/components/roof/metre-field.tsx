import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { buildingDisplay } from "@/lib/roof/format";

export function MetreField({
  id,
  mm,
  onMm,
  label,
}: {
  id?: string;
  mm: number;
  onMm: (next: number) => void;
  label?: string;
}) {
  const [text, setText] = useState(() => buildingDisplay(mm));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(buildingDisplay(mm));
  }, [mm, focused]);

  return (
    <Input
      id={id}
      aria-label={label}
      inputMode="decimal"
      className="font-mono"
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        const n = Number(text.replace(",", "."));
        if (Number.isFinite(n) && n > 0) onMm(n * 1000);
        else setText(buildingDisplay(mm));
      }}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        const n = Number(v.replace(",", "."));
        if (Number.isFinite(n) && n > 0) onMm(n * 1000);
      }}
    />
  );
}

export function MmField({
  id,
  value,
  onChange,
  min = 0,
  className,
}: {
  id?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  className?: string;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  return (
    <Input
      id={id}
      inputMode="decimal"
      className={className ? `font-mono ${className}` : "font-mono"}
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        const n = Number(text.replace(",", "."));
        if (Number.isFinite(n) && n >= min) onChange(n);
        else setText(String(value));
      }}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        const n = Number(v.replace(",", "."));
        if (Number.isFinite(n) && n >= min) onChange(n);
      }}
    />
  );
}
