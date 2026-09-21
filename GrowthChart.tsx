"use client";

import { useMemo, useState } from "react";
import type { YearRow } from "@/lib/compound";
import { formatMoney, type CurrencyCode } from "@/lib/currency";

interface GrowthChartProps {
  rows: YearRow[];
  moment: YearRow | null;
  currency: CurrencyCode;
  /** Externally-controlled inspection year (time scrubber). Hover takes precedence. */
  scrubYear: number | null;
  onScrub: (year: number | null) => void;
}

const W = 860;
const H = 340;
const PAD = { top: 16, right: 12, bottom: 36, left: 68 };

export default function GrowthChart({ rows, moment, currency, scrubYear, onScrub }: GrowthChartProps) {
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [show, setShow] = useState({ balance: true, deposits: true });

  const maxYear = rows.length - 1;
  const activeYear = hoverYear ?? scrubYear;
  const activeRow = activeYear != null ? rows[activeYear] : null;

  const { x, y, xLabels, yTicks, balanceArea, balanceLine, depositLine } = useMemo(() => {
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const peak = Math.max(1, ...rows.map((r) => r.endBalance));

    const magnitude = Math.pow(10, Math.floor(Math.log10(peak)));
    const normalized = peak / magnitude;
    const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
    const ceil = nice * magnitude;

    const x = (year: number) => PAD.left + (year / Math.max(1, maxYear)) * innerW;
    const y = (v: number) => PAD.top + innerH - (v / ceil) * innerH;

    const trace = (get: (r: YearRow) => number) =>
      rows
        .map((r) => `${r.year === 0 ? "M" : "L"}${x(r.year).toFixed(2)},${y(get(r)).toFixed(2)}`)
        .join(" ");

    const bal = trace((r) => r.endBalance);
    const dep = trace((r) => r.totalDeposited);
    const baseY = PAD.top + innerH;
    const firstX = x(0).toFixed(2);
    const lastX = x(maxYear).toFixed(2);

    const years: number[] =
      maxYear <= 3 ? rows.map((r) => r.year) : [...new Set([0, Math.round(maxYear / 2), maxYear])];

    return {
      x,
      y,
      balanceLine: bal,
      depositLine: dep,
      balanceArea: `${bal} L${lastX},${baseY} L${firstX},${baseY} Z`,
      xLabels: years.map((yr) => ({
        yr,
        px: x(yr),
        label: yr === 0 ? "Today" : yr === maxYear ? `Yr ${maxYear}` : `Yr ${yr}`,
      })),
      yTicks: [0, 0.25, 0.5, 0.75, 1].map((f) => ({ value: ceil * f, py: y(ceil * f) })),
    };
  }, [rows, maxYear]);

  const yearFromClientX = (clientX: number, svg: SVGSVGElement) => {
    const rect = svg.getBoundingClientRect();
    const svgX = (clientX - rect.left) * (W / rect.width);
    const frac = (svgX - PAD.left) / (W - PAD.left - PAD.right);
    return Math.max(0, Math.min(maxYear, Math.round(frac * maxYear)));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const current = activeYear ?? maxYear;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onScrub(Math.max(0, current - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onScrub(Math.min(maxYear, current + 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      onScrub(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onScrub(maxYear);
    } else if (e.key === "Escape") {
      onScrub(null);
      setHoverYear(null);
    }
  };

  const flipMarker = moment != null && y(moment.endBalance) < 84;
  const activeShare =
    activeRow && activeRow.endBalance > 0
      ? ((activeRow.endBalance - activeRow.totalDeposited) / activeRow.endBalance) * 100
      : 0;

  return (
    <div>
      <div
        className="relative rounded-xl outline-none"
        tabIndex={0}
        role="group"
        aria-label={`Balance chart. Use left and right arrow keys to inspect each year, Escape to clear. Currently ${activeRow ? `year ${activeRow.year}, ${formatMoney(activeRow.endBalance, currency, { decimals: 0 })}` : "no year selected"}.`}
        onKeyDown={onKeyDown}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full cursor-crosshair select-none"
          style={{ touchAction: "pan-y" }}
          onPointerMove={(e) => setHoverYear(yearFromClientX(e.clientX, e.currentTarget))}
          onPointerDown={(e) => setHoverYear(yearFromClientX(e.clientX, e.currentTarget))}
          onPointerLeave={() => setHoverYear(null)}
          role="img"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="snowball-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bef264" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#bef264" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* grid + axes */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={t.py}
                y2={t.py}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={1}
              />
              <text x={PAD.left - 10} y={t.py + 4} textAnchor="end" fontSize="11" fill="#63676f" fontWeight={600}>
                {formatMoney(t.value, currency, { compact: true })}
              </text>
            </g>
          ))}
          {xLabels.map((l) => (
            <text key={l.yr} x={l.px} y={H - 10} textAnchor="middle" fontSize="11" fill="#63676f" fontWeight={600}>
              {l.label}
            </text>
          ))}

          {/* snowball-moment guide */}
          {moment && show.balance && (
            <line
              x1={x(moment.year)}
              x2={x(moment.year)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="#bef264"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.45}
            />
          )}

          {/* deposits */}
          {show.deposits && (
            <path
              d={depositLine}
              fill="none"
              stroke="#8e93a1"
              strokeWidth={1.75}
              strokeDasharray="6 5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* balance */}
          {show.balance && (
            <>
              <path d={balanceArea} fill="url(#snowball-area)" />
              <path
                d={balanceLine}
                fill="none"
                stroke="#f4f5f7"
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle cx={x(maxYear)} cy={y(rows[maxYear].endBalance)} r={4.5} fill="#0a0b0e" stroke="#f4f5f7" strokeWidth={2.5} />
            </>
          )}

          {/* snowball-moment marker */}
          {moment && show.balance && (
            <rect
              x={x(moment.year) - 5}
              y={y(moment.endBalance) - 5}
              width={10}
              height={10}
              transform={`rotate(45 ${x(moment.year)} ${y(moment.endBalance)})`}
              fill="#bef264"
              stroke="#0a0b0e"
              strokeWidth={1.5}
            />
          )}

          {/* inspection crosshair */}
          {activeRow && activeYear != null && (
            <g>
              <line
                x1={x(activeRow.year)}
                x2={x(activeRow.year)}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="#bef264"
                strokeWidth={1}
                opacity={0.6}
              />
              {show.balance && (
                <circle cx={x(activeRow.year)} cy={y(activeRow.endBalance)} r={5} fill="#0a0b0e" stroke="#f4f5f7" strokeWidth={2.5} />
              )}
              {show.deposits && (
                <circle cx={x(activeRow.year)} cy={y(activeRow.totalDeposited)} r={4} fill="#0a0b0e" stroke="#8e93a1" strokeWidth={2.5} />
              )}
            </g>
          )}
        </svg>

        {/* moment badge */}
        {moment && show.balance && (
          <div
            className="pointer-events-none absolute z-10"
            style={{
              left: `${(x(moment.year) / W) * 100}%`,
              top: `${(y(moment.endBalance) / H) * 100}%`,
              transform: flipMarker ? "translate(-50%, 12px)" : "translate(-50%, calc(-100% - 12px))",
            }}
          >
            <div className="whitespace-nowrap rounded-md border border-lime-300/30 bg-[#101216] px-2.5 py-1 text-[11px] font-bold text-lime-300">
              Snowball moment · Yr {moment.year}
            </div>
          </div>
        )}

        {/* tooltip */}
        {activeRow && activeYear != null && (
          <div
            className="pointer-events-none absolute z-20 w-60 rounded-xl border border-white/10 bg-[#16181e] p-4 shadow-2xl"
            style={{ left: `${(x(activeRow.year) / W) * 100}%`, top: 0, transform: "translateX(-50%) translateY(-4px)" }}
          >
            <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              {activeRow.year === 0 ? "Today" : `Year ${activeRow.year}`}
            </div>
            <div className="mt-1 text-[22px] font-bold tabular-nums tracking-tight text-white">
              {formatMoney(activeRow.endBalance, currency, { decimals: 0 })}
            </div>
            <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-zinc-500" style={{ width: `${100 - activeShare}%` }} />
              <div className="h-full bg-lime-300" style={{ width: `${activeShare}%` }} />
            </div>
            <div className="mt-2 space-y-1 text-xs tabular-nums">
              <div className="flex justify-between">
                <span className="text-zinc-500">Deposited</span>
                <span className="font-semibold text-zinc-200">
                  {formatMoney(activeRow.totalDeposited, currency, { decimals: 0 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Interest</span>
                <span className="font-semibold text-lime-300">
                  {formatMoney(activeRow.endBalance - activeRow.totalDeposited, currency, { decimals: 0 })}
                </span>
              </div>
            </div>
          </div>
        )}

        <span className="sr-only" role="status">
          {activeRow
            ? `Year ${activeRow.year}: balance ${formatMoney(activeRow.endBalance, currency, { decimals: 0 })}, deposited ${formatMoney(activeRow.totalDeposited, currency, { decimals: 0 })}.`
            : ""}
        </span>
      </div>

      {/* legend / series toggles */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={show.balance}
          onClick={() => setShow((s) => ({ ...s, balance: !s.balance }))}
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
            show.balance
              ? "border-white/15 bg-white/[0.05] text-zinc-200"
              : "border-white/[0.07] text-zinc-600 hover:text-zinc-400"
          }`}
        >
          <span className={`h-[3px] w-6 rounded-full ${show.balance ? "bg-white" : "bg-zinc-700"}`} />
          Balance
        </button>
        <button
          type="button"
          aria-pressed={show.deposits}
          onClick={() => setShow((s) => ({ ...s, deposits: !s.deposits }))}
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
            show.deposits
              ? "border-white/15 bg-white/[0.05] text-zinc-200"
              : "border-white/[0.07] text-zinc-600 hover:text-zinc-400"
          }`}
        >
          <span className={`w-6 border-t-2 border-dashed ${show.deposits ? "border-zinc-400" : "border-zinc-700"}`} />
          Deposits
        </button>
        {moment && (
          <span className="inline-flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-zinc-500">
            <span className="inline-block h-2 w-2 rotate-45 bg-lime-300" />
            Interest passes deposits at year {moment.year}
          </span>
        )}
      </div>
    </div>
  );
}
