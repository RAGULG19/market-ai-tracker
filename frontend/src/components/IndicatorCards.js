import { formatNumber } from "../services/format";

/**
 * Indicator value cards with optional user toggles.
 * Groups: Trend | Momentum | Volatility | Volume — not everything is
 * rendered at once; each card can be hidden via `hidden` set.
 */
const GROUPS = [
  {
    id: "trend",
    label: "Trend",
    items: [
      { key: "sma20", label: "SMA 20" },
      { key: "sma50", label: "SMA 50" },
      { key: "sma200", label: "SMA 200" },
      { key: "ema20", label: "EMA 20" },
      { key: "ema50", label: "EMA 50" },
      { key: "ema200", label: "EMA 200" },
    ],
  },
  {
    id: "momentum",
    label: "Momentum",
    items: [
      { key: "rsi", label: "RSI (14)" },
      { key: "macd", label: "MACD" },
      { key: "macd_signal", label: "MACD Signal" },
      { key: "macd_hist", label: "MACD Hist." },
      { key: "stoch_k", label: "Stochastic %K" },
      { key: "stoch_d", label: "Stochastic %D" },
    ],
  },
  {
    id: "volatility",
    label: "Volatility",
    items: [
      { key: "bb_upper", label: "BB Upper" },
      { key: "bb_mid", label: "BB Middle" },
      { key: "bb_lower", label: "BB Lower" },
      { key: "atr", label: "ATR (14)" },
      { key: "atr_pct", label: "ATR %", digits: 2, suffix: "%" },
      {
        key: "volatility_ann_pct",
        label: "Volatility (ann.)",
        digits: 1,
        suffix: "%",
      },
    ],
  },
  {
    id: "volume",
    label: "Volume",
    items: [
      { key: "volume", label: "Volume", digits: 0 },
      { key: "volume_avg20", label: "Vol SMA 20", digits: 0 },
      { key: "obv", label: "OBV", digits: 0 },
      { key: "support_60", label: "Support (60d)" },
      { key: "resistance_60", label: "Resistance (60d)" },
    ],
  },
];

export function indicatorValue(item, indicators) {
  const v = indicators ? indicators[item.key] : null;
  if (v === null || v === undefined) return "—";
  const digits = item.digits !== undefined ? item.digits : 2;
  const base = formatNumber(v, digits);
  return item.suffix ? `${base}${item.suffix}` : base;
}

export default function IndicatorCards({ indicators }) {
  if (!indicators) return null;
  return (
    <section className="indicator-groups" aria-label="Technical indicators">
      {GROUPS.map((group) => (
        <div className="card indicator-group" key={group.id}>
          <h3 className="card-title">{group.label}</h3>
          <div className="indicator-grid">
            {group.items.map((item) => (
              <div className="indicator-cell" key={item.key}>
                <span className="indicator-label">{item.label}</span>
                <span className="indicator-value">
                  {indicatorValue(item, indicators)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
