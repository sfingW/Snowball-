"use client";

import { CURRENCIES, type CurrencyCode } from "@/lib/currency";

interface CurrencySelectProps {
  value: CurrencyCode;
  onChange: (c: CurrencyCode) => void;
}

/** Compact native select — free keyboard + screen-reader support, styled to match. */
export default function CurrencySelect({ value, onChange }: CurrencySelectProps) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Currency</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CurrencyCode)}
        className="h-9 cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/[0.04] pl-3 pr-8 text-[13px] font-bold tabular-nums text-zinc-200 outline-none transition-colors hover:border-white/20 focus:border-lime-300/60 [&>option]:bg-[#16181e]"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code} title={c.name}>
            {c.symbol} {c.code}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-zinc-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </label>
  );
}
