export type InterestMode = "compound" | "daily" | "simple";

export interface CalculatorInputs {
  principal: number; // starting amount
  monthly: number; // monthly contribution (added at month-end)
  annualRate: number; // NOMINAL annual rate in %
  years: number;
  mode?: InterestMode;
}

export interface YearRow {
  year: number;
  startBalance: number;
  contributionsThisYear: number;
  interestThisYear: number;
  endBalance: number;
  totalDeposited: number; // principal + all monthly deposits to date
}

export interface CalculationResult {
  finalBalance: number;
  totalDeposited: number;
  totalInterest: number;
  rows: YearRow[];
}

export function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/**
 * Project growth under one of three conventions:
 * - compound: nominal rate, compounded monthly (rate/12 per month)
 * - daily:    nominal rate, compounded daily  (rate/365 per day)
 * - simple:   each deposit earns simple interest for its time invested;
 *             interest is never reinvested
 */
export function calculateGrowth(inputs: CalculatorInputs): CalculationResult {
  const principal = Math.max(0, inputs.principal || 0);
  const monthly = Math.max(0, inputs.monthly || 0);
  const annualRate = Math.max(0, inputs.annualRate || 0);
  const years = Math.max(1, Math.min(60, Math.round(inputs.years || 1)));
  const mode: InterestMode = inputs.mode ?? "compound";
  const r = annualRate / 100;

  const rows: YearRow[] = [
    {
      year: 0,
      startBalance: principal,
      contributionsThisYear: 0,
      interestThisYear: 0,
      endBalance: principal,
      totalDeposited: principal,
    },
  ];

  if (mode === "simple") {
    const mRate = r / 12;
    let contribs = 0;
    let interest = 0;
    for (let y = 1; y <= years; y++) {
      const start = principal + contribs + interest;
      let yearInterest = 0;
      for (let m = 0; m < 12; m++) {
        yearInterest += (principal + contribs) * mRate;
        contribs += monthly;
      }
      interest += yearInterest;
      const totalDeposited = principal + contribs;
      rows.push({
        year: y,
        startBalance: start,
        contributionsThisYear: monthly * 12,
        interestThisYear: yearInterest,
        endBalance: principal + contribs + interest,
        totalDeposited,
      });
    }
  } else {
    // Per-month growth factor: monthly compounding vs daily compounding.
    // Month-end deposits earn nothing intra-month under both.
    const step = mode === "daily" ? Math.pow(1 + r / 365, 365 / 12) : 1 + r / 12;
    let balance = principal;
    for (let y = 1; y <= years; y++) {
      const start = balance;
      let yearInterest = 0;
      for (let m = 0; m < 12; m++) {
        const grown = balance * step;
        yearInterest += grown - balance;
        balance = grown + monthly;
      }
      const totalDeposited = principal + monthly * 12 * y;
      rows.push({
        year: y,
        startBalance: start,
        contributionsThisYear: monthly * 12,
        interestThisYear: yearInterest,
        endBalance: balance,
        totalDeposited,
      });
    }
  }

  const last = rows[rows.length - 1];
  return {
    finalBalance: last.endBalance,
    totalDeposited: last.totalDeposited,
    totalInterest: last.endBalance - last.totalDeposited,
    rows,
  };
}

/** The first year where earned interest exceeds everything deposited — the snowball moment. */
export function findSnowballMoment(rows: YearRow[]): YearRow | null {
  for (const r of rows) {
    if (r.year === 0) continue;
    if (r.endBalance - r.totalDeposited > r.totalDeposited) return r;
  }
  return null;
}

/** Serialise the yearly breakdown as CSV for export. */
export function rowsToCSV(rows: YearRow[]): string {
  const header = "year,start_balance,contributed,interest,end_balance,total_deposited";
  const body = rows
    .filter((r) => r.year > 0)
    .map((r) =>
      [
        r.year,
        r.startBalance.toFixed(2),
        r.contributionsThisYear.toFixed(2),
        r.interestThisYear.toFixed(2),
        r.endBalance.toFixed(2),
        r.totalDeposited.toFixed(2),
      ].join(",")
    );
  return [header, ...body].join("\n");
}
