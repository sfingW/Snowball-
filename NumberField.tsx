"use client";

import { useId } from "react";

interface NumberFieldProps {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
}

export default function NumberField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
  prefix,
  suffix,
}: NumberFieldProps) {
  const id = useId();

  const handleInput = (raw: string) => {
    if (raw === "") {
      onChange(0);
      return;
    }
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) return;
    onChange(parsed);
  };

  const clamped = Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  const percent = max > min ? ((clamped - min) / (max - min)) * 100 : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-semibold text-zinc-200">
          {label}
        </label>
        {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      </div>
      <div className="relative mt-1.5">
        {prefix && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-zinc-500">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => handleInput(e.target.value)}
          className={`h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] pr-12 text-[16px] font-semibold tabular-nums text-white outline-none transition-colors focus:border-lime-300/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-lime-300/10 ${
            prefix ? "pl-8" : "pl-3.5"
          }`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-500">
            {suffix}
          </span>
        )}
      </div>
      <input
        type="range"
        aria-label={`${label} slider`}
        min={min}
        max={max}
        step={step}
        value={clamped}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="ui-range mt-2.5 w-full"
        style={{ ["--fill" as string]: `${percent}%` }}
      />
    </div>
  );
}
