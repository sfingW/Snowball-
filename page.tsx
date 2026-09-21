"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NumberField from "@/components/NumberField";
import GrowthChart from "@/components/GrowthChart";
import YearTable from "@/components/YearTable";
import SegmentedControl, { type SegmentOption } from "@/components/SegmentedControl";
import CurrencySelect from "@/components/CurrencySelect";
import { useTweenedNumber } from "@/hooks/useTweenedNumber";
import {
  calculateGrowth,
  clamp,
  findSnowballMoment,
  rowsToCSV,
  type InterestMode,
} from "@/lib/compound";
import { formatMoney, getCurrency, isCurrencyCode, type CurrencyCode } from "@/lib/currency";

/* ── presets ─────────────────────────────────────────── */
type PresetKey = "starter" | "home" | "retirement" | "custom";
const PRESETS: { key: Exclude<PresetKey, "custom">; label: string; principal: number; monthly: number; annualRate: number; years: number }[] = [
  { key: "starter", label: "Starter", principal: 1000, monthly: 100, annualRate: 5, years: 10 },
  { key: "home", label: "Home", principal: 5000, monthly: 350, annualRate: 5, years: 8 },
  { key: "retirement", label: "Retirement", principal: 10000, monthly: 500, annualRate: 7, years: 30 },
];

/* ── interest modes ──────────────────────────────────── */
const MODE_META: Record<InterestMode, { short: string; label: string; desc: string; freq: string }> = {
  compound: {
    short: "Compound",
    label: "Compound · monthly",
    desc: "Interest earns interest, compounded every month.",
    freq: "monthly compounding",
  },
  daily: {
    short: "Daily",
    label: "Daily compounding",
    desc: "Compounding every single day — the fastest growth.",
    freq: "daily compounding",
  },
  simple: {
    short: "Simple",
    label: "Simple interest",
    desc: "Interest on deposits only. Never reinvested.",
    freq: "no compounding",
  },
};
const MODE_ORDER: InterestMode[] = ["compound", "daily", "simple"];

type View = "chart" | "table";

const STORE_KEY = "snowball:v1";

/* ── icons ───────────────────────────────────────────── */
function Snowflake({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 2v20" />
      <path d="M3.34 7l17.32 10" />
      <path d="M20.66 7L3.34 17" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 21h16" />
    </svg>
  );
}

/* ── page ────────────────────────────────────────────── */
export default function Home() {
  const [principal, setPrincipal] = useState(5000);
  const [monthly, setMonthly] = useState(300);
  const [annualRate, setAnnualRate] = useState(7);
  const [years, setYears] = useState(25);
  const [mode, setMode] = useState<InterestMode>("compound");
  const [currency, setCurrency] = useState<CurrencyCode>("GBP");
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<View>("chart");
  const [scrubYear, setScrubYear] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const playFromRef = useRef(0);

  // Restore state: shared URL wins, then last visit, then defaults
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    let stored: Record<string, unknown> = {};
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) stored = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      /* corrupted storage — fall through to defaults */
    }
    const num = (key: string, fallback: number, min: number, max: number, round = false) => {
      const fromUrl = parseFloat(q.get(key) ?? "");
      const fromStore = typeof stored[key] === "number" ? (stored[key] as number) : NaN;
      const v = Number.isFinite(fromUrl) ? fromUrl : fromStore;
      if (!Number.isFinite(v)) return fallback;
      const c = clamp(v, min, max);
      return round ? Math.round(c) : c;
    };
    setPrincipal(num("initial_capital", 5000, 0, 10_000_000));
    setMonthly(num("monthly_savings", 300, 0, 100_000));
    setYears(num("investment_horizon", 25, 1, 60, true));
    setAnnualRate(num("interest_rate", 7, 0, 30));
    const m = q.get("mode") ?? (typeof stored.mode === "string" ? stored.mode : null);
    if (m === "compound" || m === "daily" || m === "simple") setMode(m);
    const c = q.get("currency") ?? (typeof stored.currency === "string" ? stored.currency : null);
    if (isCurrencyCode(c)) setCurrency(c);
  }, []);

  // Persist every change for the next visit
  useEffect(() => {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          initial_capital: principal,
          monthly_savings: monthly,
          investment_horizon: years,
          interest_rate: annualRate,
          mode,
          currency,
        })
      );
    } catch {
      /* storage unavailable — app still works */
    }
  }, [principal, monthly, years, annualRate, mode, currency]);

  const yrCount = clamp(Math.round(years), 1, 60);
  const ccy = getCurrency(currency);
  const meta = MODE_META[mode];

  const plan = useMemo(
    () => ({
      principal: clamp(principal, 0, 10_000_000),
      monthly: clamp(monthly, 0, 100_000),
      annualRate: clamp(annualRate, 0, 30),
      years: yrCount,
    }),
    [principal, monthly, annualRate, yrCount]
  );

  const result = useMemo(() => calculateGrowth({ ...plan, mode }), [plan, mode]);
  const simpleBaseline = useMemo(() => calculateGrowth({ ...plan, mode: "simple" }), [plan]);
  const compoundAlt = useMemo(() => calculateGrowth({ ...plan, mode: "compound" }), [plan]);
  const moment = useMemo(() => findSnowballMoment(result.rows), [result.rows]);

  const multiple = result.totalDeposited > 0 ? result.finalBalance / result.totalDeposited : 0;
  const depositShare = result.finalBalance > 0 ? (result.totalDeposited / result.finalBalance) * 100 : 0;
  const interestShare = 100 - depositShare;

  const heroBalance = useTweenedNumber(result.finalBalance);
  const tweenDeposited = useTweenedNumber(result.totalDeposited);
  const tweenInterest = useTweenedNumber(result.totalInterest);
  const tweenMultiple = useTweenedNumber(multiple);

  // Time scrubber, clamped to the current horizon
  const scrub = scrubYear == null ? null : Math.min(scrubYear, yrCount);
  const scrubRow = scrub != null ? result.rows[scrub] : null;

  // Playback: any input change stops the tape
  useEffect(() => {
    setPlaying(false);
  }, [principal, monthly, annualRate, years, mode]);

  useEffect(() => {
    if (!playing) return;
    const from = playFromRef.current;
    if (from >= yrCount) {
      setPlaying(false);
      return;
    }
    const duration = Math.min(6000, Math.max(1500, (yrCount - from) * 160));
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      setScrubYear(Math.round(from + (yrCount - from) * t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    const from = scrub == null || scrub >= yrCount ? 0 : scrub;
    playFromRef.current = from;
    setScrubYear(from);
    setPlaying(true);
  };

  const activePreset: PresetKey =
    PRESETS.find(
      (p) => principal === p.principal && monthly === p.monthly && annualRate === p.annualRate && years === p.years
    )?.key ?? "custom";

  const presetOptions: SegmentOption<PresetKey>[] = [
    ...PRESETS.map((p) => ({ value: p.key as PresetKey, label: p.label })),
    ...(activePreset === "custom" ? [{ value: "custom" as PresetKey, label: "Custom", disabled: true }] : []),
  ];

  const applyPreset = (key: PresetKey) => {
    const p = PRESETS.find((x) => x.key === key);
    if (!p) return;
    setPrincipal(p.principal);
    setMonthly(p.monthly);
    setAnnualRate(p.annualRate);
    setYears(p.years);
    setScrubYear(null);
  };

  const shareResults = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("initial_capital", String(Math.round(plan.principal)));
    url.searchParams.set("monthly_savings", String(Math.round(plan.monthly)));
    url.searchParams.set("investment_horizon", String(yrCount));
    url.searchParams.set("interest_rate", String(plan.annualRate));
    url.searchParams.set("mode", mode);
    url.searchParams.set("currency", currency);
    window.history.replaceState(null, "", url.toString());
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const exportCSV = () => {
    const blob = new Blob([rowsToCSV(result.rows)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `snowball-${mode}-${yrCount}y-${plan.annualRate}pct-${currency}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const insight =
    annualRate <= 0 ? (
      <>
        At a 0% rate nothing grows — <span className="font-semibold text-lime-300">even 4% changes everything.</span>{" "}
        Nudge the rate slider.
      </>
    ) : interestShare >= 60 ? (
      <>
        <span className="font-semibold text-lime-300">{interestShare.toFixed(0)}% of this is pure growth.</span>{" "}
        {mode === "simple" ? "Even simple interest adds up over time." : "Compounding is doing most of the work here."}
      </>
    ) : interestShare >= 35 ? (
      <>
        <span className="font-semibold text-lime-300">{interestShare.toFixed(0)}% of this is growth</span> — push time
        or rate to grow that slice.
      </>
    ) : (
      <>
        Only <span className="font-semibold text-lime-300">{interestShare.toFixed(0)}% is growth so far</span> — time
        and rate are your levers.
      </>
    );

  const gainVsSimple = result.finalBalance - simpleBaseline.finalBalance;
  const compoundBeatsSimple = compoundAlt.finalBalance - result.finalBalance;
  const comparison =
    mode === "simple" ? (
      compoundBeatsSimple > 0.01 && (
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
          Monthly compounding would pay{" "}
          <span className="font-semibold tabular-nums text-lime-300">
            {formatMoney(compoundBeatsSimple, currency, { decimals: 0 })}
          </span>{" "}
          more on this exact plan.
        </p>
      )
    ) : (
      gainVsSimple > 0.01 && (
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
          That&apos;s{" "}
          <span className="font-semibold tabular-nums text-lime-300">
            {formatMoney(gainVsSimple, currency, { decimals: 0 })}
          </span>{" "}
          more than simple interest would pay.
        </p>
      )
    );

  return (
    <div className="relative min-h-full">
      {/* faint top aura — the only backdrop treatment */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-0 mx-auto h-[420px] max-w-5xl bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(190,242,100,0.06),transparent)]"
      />

      {/* ── header ── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0a0b0e]/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
          <a href="#" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-lime-300 text-zinc-950">
              <Snowflake />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-white">Snowball</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-400 md:flex">
            <a href="#calculator" className="transition-colors hover:text-white">
              Calculator
            </a>
            <a href="#method" className="transition-colors hover:text-white">
              Method
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <CurrencySelect value={currency} onChange={setCurrency} />
            <button
              onClick={shareResults}
              className="h-9 rounded-lg bg-lime-300 px-4 text-[13px] font-bold text-zinc-950 transition-colors hover:bg-lime-200"
            >
              {copied ? (
                "Link copied"
              ) : (
                <>
                  <span className="sm:hidden">Share</span>
                  <span className="hidden sm:inline">Share results</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8">
        {/* ── title ── */}
        <div className="enter max-w-2xl pb-7 pt-11">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-300">
            Compound interest calculator
          </p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight text-white sm:text-[44px] sm:leading-[1.05]">
            Watch small deposits compound into wealth.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-zinc-400">
            Set your plan on the left. Every figure, the chart and the breakdown update live —
            drag through time to see exactly how it happens.
          </p>
        </div>

        {/* ── compact result (mobile only — inputs push the panel down) ── */}
        <div className="enter mb-5 rounded-2xl border border-white/[0.08] bg-[#101216] p-5 lg:hidden" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Projected balance</p>
            <p className="text-xs text-zinc-500">{meta.label}</p>
          </div>
          <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-white">
            {formatMoney(heroBalance, currency, { decimals: 0 })}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            <span className="font-bold tabular-nums text-lime-300">{tweenMultiple.toFixed(2)}×</span> what you
            put in · tune your plan below
          </p>
        </div>

        {/* ── instrument ── */}
        <section
          id="calculator"
          className="enter scroll-mt-20 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101216]"
          style={{ animationDelay: "0.08s" }}
        >
          <div className="grid lg:grid-cols-[330px_1fr]">
            {/* controls */}
            <aside className="border-b border-white/[0.07] p-6 lg:border-b-0 lg:border-r">
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Preset</p>
              <div className="mt-2">
                <SegmentedControl options={presetOptions} value={activePreset} onChange={applyPreset} ariaLabel="Plan presets" />
              </div>

              <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-zinc-500">Interest type</p>
              <div className="mt-2">
                <SegmentedControl
                  options={MODE_ORDER.map((m) => ({ value: m, label: MODE_META[m].label.split(" ")[0] === "Compound" ? "Compound" : MODE_META[m].label.split(" ")[0] }))}
                  value={mode}
                  onChange={(m) => {
                    setMode(m);
                    setScrubYear(null);
                  }}
                  ariaLabel="Interest type"
                />
              </div>
              <p className="mt-1.5 min-h-[32px] text-xs leading-relaxed text-zinc-500">{meta.desc}</p>

              <div className="mt-4 space-y-5">
                <NumberField label="Starting amount" hint="you have now" value={principal} onChange={setPrincipal} min={0} max={500000} step={100} prefix={ccy.symbol} />
                <NumberField label="Monthly deposit" hint="every month" value={monthly} onChange={setMonthly} min={0} max={5000} step={10} prefix={ccy.symbol} />
                <NumberField label="Annual rate" hint="nominal" value={annualRate} onChange={setAnnualRate} min={0} max={15} step={0.1} suffix="%" />
                <NumberField label="Time horizon" hint="years invested" value={years} onChange={(v) => setYears(Math.round(v))} min={1} max={50} step={1} suffix="yrs" />
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-white/[0.07] pt-4">
                <p className="text-xs leading-relaxed text-zinc-500">
                  Nominal annual rate ·<br /> {meta.freq}
                </p>
                <button
                  onClick={() => {
                    setPrincipal(5000);
                    setMonthly(300);
                    setAnnualRate(7);
                    setYears(25);
                    setScrubYear(null);
                  }}
                  className="text-xs font-semibold text-zinc-400 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  Reset
                </button>
              </div>
            </aside>

            {/* results */}
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                    Projected balance · {yrCount} {yrCount === 1 ? "year" : "years"} · {meta.label}
                  </p>
                  <p className="mt-1.5 text-[44px] font-semibold tabular-nums leading-none tracking-tight text-white sm:text-[56px]">
                    {formatMoney(heroBalance, currency, { decimals: 0 })}
                  </p>
                  <p className="mt-2 text-sm text-zinc-400">
                    <span className="font-bold tabular-nums text-lime-300">{tweenMultiple.toFixed(2)}×</span> what
                    you put in
                  </p>
                </div>
                <SegmentedControl
                  options={[
                    { value: "chart", label: "Chart" },
                    { value: "table", label: "Breakdown" },
                  ]}
                  value={view}
                  onChange={setView}
                  ariaLabel="Result view"
                />
              </div>

              <p className="mt-4 text-sm leading-relaxed text-zinc-400">{insight}</p>
              {comparison}

              {/* split */}
              <div className="mt-4">
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-zinc-400 transition-all duration-500" style={{ width: `${depositShare}%` }} />
                  <div className="h-full bg-lime-300 transition-all duration-500" style={{ width: `${interestShare}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px] tabular-nums">
                  <span className="inline-flex items-center gap-2 text-zinc-400">
                    <span className="h-2 w-2 rounded-full bg-zinc-400" />
                    Deposited <strong className="font-semibold text-zinc-100">{formatMoney(tweenDeposited, currency, { decimals: 0 })}</strong>
                  </span>
                  <span className="inline-flex items-center gap-2 text-zinc-400">
                    <span className="h-2 w-2 rounded-full bg-lime-300" />
                    Interest <strong className="font-semibold text-lime-300">{formatMoney(tweenInterest, currency, { decimals: 0 })}</strong>
                  </span>
                </div>
              </div>

              {/* view */}
              <div className="mt-6 border-t border-white/[0.07] pt-6">
                {view === "chart" ? (
                  <GrowthChart rows={result.rows} moment={moment} currency={currency} scrubYear={scrub} onScrub={setScrubYear} />
                ) : (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[13px] text-zinc-500">
                        {yrCount} {yrCount === 1 ? "year" : "years"} · all figures in {currency}
                      </p>
                      <button
                        onClick={exportCSV}
                        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-lime-300/50 hover:text-white"
                      >
                        <DownloadIcon />
                        Export CSV
                      </button>
                    </div>
                    <YearTable rows={result.rows} currency={currency} highlightYear={scrub} />
                  </div>
                )}
              </div>

              {/* time scrubber */}
              <div className="mt-5 flex items-center gap-4 border-t border-white/[0.07] pt-5">
                <button
                  onClick={togglePlay}
                  aria-label={playing ? "Pause time-lapse" : "Play time-lapse"}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lime-300 text-zinc-950 transition-colors hover:bg-lime-200"
                >
                  {playing ? <PauseIcon /> : <PlayIcon />}
                </button>
                <div className="min-w-0 flex-1">
                  <input
                    type="range"
                    aria-label="Scrub through time"
                    min={0}
                    max={yrCount}
                    step={1}
                    value={scrub ?? yrCount}
                    onChange={(e) => {
                      setPlaying(false);
                      setScrubYear(parseInt(e.target.value, 10));
                    }}
                    className="ui-range w-full"
                    style={{ ["--fill" as string]: `${((scrub ?? yrCount) / Math.max(1, yrCount)) * 100}%` }}
                  />
                  <div className="mt-1.5 flex items-baseline justify-between gap-3">
                    <p className="truncate text-xs text-zinc-500">
                      {scrubRow && scrub !== yrCount ? (
                        <>
                          Year {scrubRow.year} ·{" "}
                          <span className="font-semibold tabular-nums text-zinc-200">
                            {formatMoney(scrubRow.endBalance, currency, { decimals: 0 })}
                          </span>{" "}
                          <span className="tabular-nums">
                            ({formatMoney(scrubRow.totalDeposited, currency, { decimals: 0 })} in ·{" "}
                            {formatMoney(scrubRow.endBalance - scrubRow.totalDeposited, currency, { decimals: 0 })} growth)
                          </span>
                        </>
                      ) : (
                        "Drag to travel through time — or press play"
                      )}
                    </p>
                    {scrub != null && (
                      <button
                        onClick={() => {
                          setPlaying(false);
                          setScrubYear(null);
                        }}
                        className="shrink-0 text-xs font-semibold text-zinc-500 underline-offset-4 transition-colors hover:text-white hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* stat strip */}
          <div className="grid grid-cols-2 gap-px border-t border-white/[0.07] bg-white/[0.07] lg:grid-cols-4">
            {[
              { label: "Total deposited", value: formatMoney(tweenDeposited, currency, { decimals: 0 }), sub: `${formatMoney(plan.principal, currency, { decimals: 0 })} start + ${formatMoney(plan.monthly * 12, currency, { decimals: 0 })}/yr` },
              { label: "Interest earned", value: formatMoney(tweenInterest, currency, { decimals: 0 }), sub: `${interestShare.toFixed(1)}% of final balance`, hot: true },
              { label: "Snowball moment", value: moment ? `Year ${moment.year}` : "Out of reach", sub: moment ? "interest passes deposits" : "needs more time or rate" },
              { label: "Growth multiple", value: `${tweenMultiple.toFixed(2)}×`, sub: "final vs deposited" },
            ].map((s) => (
              <div key={s.label} className="bg-[#101216] px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{s.label}</p>
                <p className={`mt-1.5 text-2xl font-semibold tabular-nums tracking-tight ${"hot" in s && s.hot ? "text-lime-300" : "text-white"}`}>
                  {s.value}
                </p>
                <p className="mt-0.5 truncate text-[13px] tabular-nums text-zinc-500">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── method ── */}
        <section id="method" className="mt-16 max-w-3xl scroll-mt-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-300">Method</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              How compounding works
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">
              Every month your gains join your balance — then earn themselves. Growth starts
              slow, then goes vertical. Three rules decide how big it gets:
            </p>
            <div className="mt-6">
              {[
                ["01", "Start early", "Extra years at the end beat extra pounds at the start."],
                ["02", "Stay consistent", "Steady deposits keep feeding the snowball."],
                ["03", "Never interrupt", "Withdrawing resets the roll. Let it compound."],
              ].map(([n, t, d]) => (
                <div key={n} className="grid grid-cols-[44px_1fr] gap-3 border-t border-white/[0.07] py-4 last:border-b">
                  <span className="font-mono text-[13px] font-semibold text-lime-300">{n}</span>
                  <div>
                    <p className="text-[15px] font-semibold text-white">{t}</p>
                    <p className="mt-0.5 text-sm text-zinc-400">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── footer ── */}
      <footer className="relative z-10 border-t border-white/[0.07]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-[13px] text-zinc-500 sm:flex-row sm:px-8">
          <span className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-lime-300 text-zinc-950">
              <Snowflake className="h-3 w-3" />
            </span>
            <strong className="font-bold text-zinc-200">Snowball</strong>
          </span>
          <span>Nominal annual rate · {meta.freq} · {ccy.name} ({currency})</span>
        </div>
      </footer>
    </div>
  );
}
