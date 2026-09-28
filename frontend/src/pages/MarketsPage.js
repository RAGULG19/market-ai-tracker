import { useEffect, useState } from "react";
import api from "../services/api";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import { changeClass, formatPct, formatPrice } from "../services/format";

const TAB_ORDER = ["popular", "india", "us", "etfs", "gold", "indexes"];
const TAB_LABELS = {
  popular: "Popular",
  india: "India (NSE/BSE)",
  us: "US Stocks",
  etfs: "ETFs",
  gold: "Gold",
  indexes: "Indexes",
};

/** Curated market watchlists; quote-only requests avoid unused analysis work. */
export default function MarketsPage({ onOpen }) {
  const [watchlists, setWatchlists] = useState(null);
  const [tab, setTab] = useState("popular");
  const [quotes, setQuotes] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .watchlists()
      .then((data) => setWatchlists(data.watchlists))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  const symbols = watchlists && watchlists[tab] ? watchlists[tab] : [];

  /* Fetch quotes for the active tab (bounded concurrency, cached backend). */
  useEffect(() => {
    if (!symbols.length) return;
    let cancelled = false;
    const missing = symbols.filter((s) => !quotes[s.symbol]);
    if (!missing.length) return;

    (async () => {
      const queue = [...missing];
      const workers = Array.from({ length: 4 }, async () => {
        while (queue.length) {
          const item = queue.shift();
          try {
            const data = await api.quote(item.symbol);
            if (!cancelled) {
              setQuotes((q) => ({ ...q, [item.symbol]: data }));
            }
          } catch (e) {
            /* symbol unsupported by provider — skip silently in list view */
          }
        }
      });
      await Promise.all(workers);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, watchlists]);

  if (loading) return <LoadingState label="Loading watchlists…" />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="markets">
      <section className="card">
        <div className="tab-row" role="tablist" aria-label="Watchlists">
          {TAB_ORDER.filter((t) => watchlists && watchlists[t]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`tab ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="market-grid">
          {symbols.map((item) => {
            const q = quotes[item.symbol];
            return (
              <button
                type="button"
                className="market-tile"
                key={item.symbol}
                onClick={() => onOpen(item.symbol)}
              >
                <span className="tile-sym">{item.symbol}</span>
                <span className="tile-name">{item.name}</span>
                <span className="tile-price">
                  {q ? formatPrice(q.current_price, q.currency) : "…"}
                </span>
                <span className={`tile-change ${q ? changeClass(q.change_pct) : ""}`}>
                  {q ? formatPct(q.change_pct) : ""}
                </span>
              </button>
            );
          })}
        </div>
        <p className="chart-note">
          Watchlists are curated examples — availability depends on the data
          provider (Yahoo Finance).
        </p>
      </section>
    </div>
  );
}
