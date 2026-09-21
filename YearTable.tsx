"use client";

import type { YearRow } from "@/lib/compound";
import { formatMoney, type CurrencyCode } from "@/lib/currency";

interface YearTableProps {
  rows: YearRow[];
  currency: CurrencyCode;
  highlightYear?: number | null;
}

export default function YearTable({ rows, currency, highlightYear = null }: YearTableProps) {
  const data = rows.filter((r) => r.year > 0);
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08]">
      <div className="nice-scroll max-h-[396px] overflow-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#14161c] text-zinc-500">
              <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest">Year</th>
              <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-widest">Start</th>
              <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-widest">Paid in</th>
              <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-widest">Interest</th>
              <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-widest">Balance</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => {
              const lit = highlightYear === r.year;
              return (
                <tr
                  key={r.year}
                  className={`border-t border-white/[0.05] tabular-nums transition-colors ${
                    lit ? "bg-lime-300/[0.07] hover:bg-lime-300/[0.1]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <td className={`px-5 py-2.5 font-bold ${lit ? "text-lime-300" : "text-white"}`}>
                    {String(r.year).padStart(2, "0")}
                  </td>
                  <td className="px-5 py-2.5 text-right text-zinc-400">
                    {formatMoney(r.startBalance, currency)}
                  </td>
                  <td className="px-5 py-2.5 text-right text-zinc-400">
                    {formatMoney(r.contributionsThisYear, currency)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold text-lime-300">
                    +{formatMoney(r.interestThisYear, currency)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-bold text-white">
                    {formatMoney(r.endBalance, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
