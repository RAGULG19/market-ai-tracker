import { changeClass, formatPct, formatPrice } from "../services/format";

/**
 * Portfolio table + summary. Data lives in localStorage (no accounts, no
 * credentials). All values are informational only.
 */
export default function PortfolioPanel({
  holdings,
  quotes,
  onRemove,
  onAdd,
}) {
  const rows = holdings
    .map((h) => {
      const quote = quotes[h.symbol] || {};
      const price =
        quote.current_price != null ? quote.current_price : h.buyPrice;
      const currency = quote.currency || h.currency || "USD";
      const value = price * h.quantity;
      const invested = h.buyPrice * h.quantity;
      const pl = value - invested;
      const plPct = invested ? (pl / invested) * 100 : 0;
      return { ...h, price, currency, value, invested, pl, plPct, name: quote.name };
    })
    .sort((a, b) => b.value - a.value);

  const totalInvested = rows.reduce((s, r) => s + r.invested, 0);
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const totalPl = totalValue - totalInvested;
  const totalPlPct = totalInvested ? (totalPl / totalInvested) * 100 : 0;
  const baseCurrency = rows[0] ? rows[0].currency : "USD";

  return (
    <div className="portfolio">
      <section className="card" aria-label="Portfolio summary">
        <div className="summary-grid">
          <div className="stat">
            <dt>Invested</dt>
            <dd>{formatPrice(totalInvested, baseCurrency)}</dd>
          </div>
          <div className="stat">
            <dt>Current value</dt>
            <dd>{formatPrice(totalValue, baseCurrency)}</dd>
          </div>
          <div className="stat">
            <dt>Profit / loss</dt>
            <dd className={changeClass(totalPl)}>
              {formatPrice(totalPl, baseCurrency)} ({formatPct(totalPlPct)})
            </dd>
          </div>
          <div className="stat">
            <dt>Holdings</dt>
            <dd>{rows.length}</dd>
          </div>
        </div>
        <p className="chart-note">
          Calculations are informational only and use delayed prices. Mixed
          currencies are summed per holding currency where providers differ.
        </p>
      </section>

      {rows.length === 0 ? (
        <div className="card empty-card">
          <p className="empty-state">
            Your portfolio is empty. Add a stock with quantity and buy price.
          </p>
          <button type="button" className="btn btn-primary" onClick={onAdd}>
            Add holding
          </button>
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-scroll">
            <table className="compare-table portfolio-table">
              <thead>
                <tr>
                  <th scope="col">Symbol</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Buy price</th>
                  <th scope="col">Current</th>
                  <th scope="col">Invested</th>
                  <th scope="col">Value</th>
                  <th scope="col">P/L</th>
                  <th scope="col">Allocation</th>
                  <th scope="col" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.symbol}>
                    <th scope="row">
                      {r.symbol}
                      {r.name && <span className="row-sub">{r.name}</span>}
                    </th>
                    <td>{r.quantity}</td>
                    <td>{formatPrice(r.buyPrice, r.currency)}</td>
                    <td>{formatPrice(r.price, r.currency)}</td>
                    <td>{formatPrice(r.invested, r.currency)}</td>
                    <td>{formatPrice(r.value, r.currency)}</td>
                    <td className={changeClass(r.pl)}>
                      {formatPrice(r.pl, r.currency)} ({formatPct(r.plPct)})
                    </td>
                    <td>
                      {totalValue
                        ? ((r.value / totalValue) * 100).toFixed(1)
                        : "0.0"}
                      %
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => onRemove(r.symbol)}
                        aria-label={`Remove ${r.symbol}`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
