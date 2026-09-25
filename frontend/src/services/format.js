/** Currency symbols for common FX codes — never hardcode "$". */
const SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  HKD: "HK$",
  AUD: "A$",
  CAD: "C$",
  CHF: "CHF ",
  KRW: "₩",
  SGD: "S$",
};

export function formatPrice(value, currency = "USD", digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  const n = Number(value);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const prefix = SYMBOLS[currency] || `${currency} `;
  return `${sign}${prefix}${abs.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function formatCompact(value, currency = "USD") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  const n = Number(value);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const prefix = SYMBOLS[currency] || `${currency} `;
  if (abs >= 1e12) return `${sign}${prefix}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${prefix}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${prefix}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3)
    return `${sign}${prefix}${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return formatPrice(n, currency);
}

export function formatPct(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  const n = Number(value);
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

export function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function changeClass(value) {
  if (value === null || value === undefined) return "";
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}
