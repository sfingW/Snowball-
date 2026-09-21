"use client";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}

/** Compact segmented control — one active pill, quiet container. */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              active
                ? "bg-lime-300 text-zinc-950"
                : "text-zinc-400 hover:text-white disabled:cursor-default disabled:opacity-60"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
