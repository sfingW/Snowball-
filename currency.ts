export type CurrencyCode = "GBP" | "USD" | "EUR" | "INR" | "JPY" | "CNY";

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  decimals: number;
}

export const CURRENCIES: Currency[] = [
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB", decimals: 2 },
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US", decimals: 2 },
  { code: "EUR", symbol: "€", name: "Euro", locale: "en-IE", decimals: 2 },
  { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN", decimals: 2 },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "en-US", decimals: 0 },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", locale: "zh-CN", decimals: 2 },
];

export function isCurrencyCode(v: unknown): v is CurrencyCode {
  return (
    typeof v === "string" && (CURRENCIES.map((c) => c.code) as string[]).includes(v)
  );
}

export function getCurrency(code: CurrencyCode): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

/** Compact magnitude without trailing ".0" (4.0 -> "4", 4.5 -> "4.5"). */
function trim(n: number): string {
  return n >= 100 ? String(Math.round(n)) : String(parseFloat(n.toFixed(1)));
}

export function formatMoney(
  value: number,
  code: CurrencyCode,
  opts?: { decimals?: number; compact?: boolean }
): string {
  const ccy = getCurrency(code);

  if (opts?.compact) {
    const abs = Math.abs(value);
    // Indian numbering uses lakh (L) and crore (Cr)
    if (code === "INR") {
      if (abs >= 1e7) return `${ccy.symbol}${trim(value / 1e7)}Cr`;
      if (abs >= 1e5) return `${ccy.symbol}${trim(value / 1e5)}L`;
      if (abs >= 1e3) return `${ccy.symbol}${trim(value / 1e3)}k`;
      return `${ccy.symbol}${Math.round(value)}`;
    }
    if (abs >= 1e9) return `${ccy.symbol}${trim(value / 1e9)}B`;
    if (abs >= 1e6) return `${ccy.symbol}${trim(value / 1e6)}M`;
    if (abs >= 1e3) return `${ccy.symbol}${trim(value / 1e3)}k`;
    return `${ccy.symbol}${Math.round(value)}`;
  }

  const d = opts?.decimals ?? ccy.decimals;
  try {
    return new Intl.NumberFormat(ccy.locale, {
      style: "currency",
      currency: ccy.code,
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(value);
  } catch {
    return `${ccy.symbol}${value.toFixed(d)}`;
  }
}
