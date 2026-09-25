import { changeClass, formatNumber, formatPct, formatPrice } from "../services/format";

/**
 * Multi-stock comparison table: price, change, RSI, trend, volatility,
 * volume, model forecast and signal — one column per symbol.
 */
export default function ComparisonTable({ results, onRemove, onOpen }) {
  if (!results || !results.length) return null;

  const rows = [
    {
      label: "Current price",
      render: (r) => formatPrice(r.current_price, r.currency),
    },
    { label: "Daily change", render: (r) => (
      <span className={changeClass(r.change_pct)}>{formatPct(r.change_pct)}</span>
    )},
    { label: "RSI (14)", render: (r) => formatNumber(r.indicators.rsi, 1) },
    {
      label: "vs SMA 50",
      render: (r) => {
        const { sma50 } = r.indicators;
        if (sma50 == null) return "—";
        const above = r.current_price > sma50;
        return (
          <span className={above ? "up" : "down"}>
            {above ? "Above" : "Below"} ({formatPrice(sma50, r.currency)})
          </span>
        );
      },
    },
    {
      label: "EMA 20 / 50",
      render: (r) => {
        const { ema20, ema50 } = r.indicators;
        if (ema20 == null || ema50 == null) return "—";
        return `${formatNumber(ema20, 2)} / ${formatNumber(ema50, 2)}`;
      },
    },
    {
      label: "Volatility (ann.)",
      render: (r) =>
        r.indicators.volatility_ann_pct != null
          ? `${formatNumber(r.indicators.volatility_ann_pct, 1)}%`
          : "—",
    },
    { label: "Volume", render: (r) => formatNumber(r.indicators.volume, 0) },
    {
      label: `Forecast (${14}d)`,
      render: (r) => (
        <span className={changeClass(r.forecast.expected_change_pct)}>
          {formatPrice(r.forecast.forecast_price, r.currency)} (
          {formatPct(r.forecast.expected_change_pct)})
        </span>
      ),
    },
    {
      label: "Model confidence",
      render: (r) => `${r.forecast.model_confidence}`,
      title: "Composite score — see Analytics page. Not a probability.",
    },
    {
      label: "Signal",
      render: (r) => (
        <span
          className={`signal-badge small ${
            r.signal.signal === "BUY"
              ? "buy"
              : r.signal.signal === "SELL"
              ? "sell"
              : "hold"
          }`}
        >
          {r.signal.signal}
        </span>
      ),
    },
  ];

  return (
    <div className="card table-card">
      <div className="table-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">Metric</th>
              {results.map((r) => (
                <th scope="col" key={r.symbol}>
                  <button
                    type="button"
                    className="col-open"
                    onClick={() => onOpen && onOpen(r.symbol)}
                    title="Open in dashboard"
                  >
                    {r.symbol}
                  </button>
                  {onRemove && (
                    <button
                      type="button"
                      className="col-remove"
                      aria-label={`Remove ${r.symbol} from comparison`}
                      onClick={() => onRemove(r.symbol)}
                    >
                      ×
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" title={row.title || ""}>
                  {row.label}
                </th>
                {results.map((r) => (
                  <td key={`${row.label}-${r.symbol}`}>{row.render(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
