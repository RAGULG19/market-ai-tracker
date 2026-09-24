import {
  changeClass,
  formatCompact,
  formatNumber,
  formatPct,
  formatPrice,
} from "../services/format";

/** Quote header: name, ticker, exchange, price, change and key stats. */
export default function StockOverview({ overview, indicators }) {
  if (!overview) return null;
  const cur = overview.currency || "USD";
  const up = changeClass(overview.change_pct);
  const marketOpen =
    overview.market_state && overview.market_state !== "CLOSED";

  const stats = [
    { label: "Open", value: formatPrice(overview.open, cur) },
    { label: "High", value: formatPrice(overview.high, cur) },
    { label: "Low", value: formatPrice(overview.low, cur) },
    {
      label: "Prev Close",
      value: formatPrice(overview.previous_close, cur),
    },
    { label: "Volume", value: formatNumber(overview.volume, 0) },
    { label: "52W High", value: formatPrice(overview.week52_high, cur) },
    { label: "52W Low", value: formatPrice(overview.week52_low, cur) },
    {
      label: "Market Cap",
      value: formatCompact(overview.market_cap, cur),
    },
  ];

  return (
    <section className="card overview-card" aria-label="Stock overview">
      <div className="overview-head">
        <div>
          <h2 className="overview-name">{overview.name}</h2>
          <p className="overview-meta">
            <span className="ticker-badge">{overview.symbol}</span>
            <span>{overview.exchange}</span>
            <span className={`dot ${marketOpen ? "open" : ""}`} aria-hidden="true">
              ●
            </span>
            <span>{marketOpen ? "Market open" : "Market closed"}</span>
          </p>
        </div>
        <div className="overview-price">
          <span className="price-big">
            {formatPrice(overview.current_price, cur)}
          </span>
          <span className={`price-change ${up}`}>
            {formatPrice(overview.change, cur)} ({formatPct(overview.change_pct)})
          </span>
        </div>
      </div>

      <dl className="stat-grid">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
        {indicators && (
          <div className="stat">
            <dt>Volatility (ann.)</dt>
            <dd>
              {indicators.volatility_ann_pct != null
                ? `${formatNumber(indicators.volatility_ann_pct, 1)}%`
                : "—"}
            </dd>
          </div>
        )}
      </dl>
      <p className="as-of">As of {overview.as_of} · Data: Yahoo Finance</p>
    </section>
  );
}
