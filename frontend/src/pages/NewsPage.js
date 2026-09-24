import { useEffect, useState } from "react";
import api from "../services/api";
import NewsPanel from "../components/NewsPanel";
import SearchBar from "../components/SearchBar";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";

/** News page: market-wide headlines by default, per-symbol on select. */
export default function NewsPage() {
  const [symbol, setSymbol] = useState(null);
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const req = symbol
      ? api.news(symbol, 12)
      : api.marketNews("stock market", 12);
    req
      .then((data) => {
        if (!cancelled) setNews(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <div className="news-page">
      <section className="card">
        <div className="news-controls">
          <div>
            <h2 className="page-title">
              {symbol ? `News · ${symbol}` : "Market news"}
            </h2>
            <p className="chart-note">
              Real headlines from Yahoo Finance; sentiment via transparent
              lexicon scoring.
            </p>
          </div>
          <div className="news-picker">
            <SearchBar onSelect={setSymbol} />
            {symbol && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSymbol(null)}
              >
                Back to market news
              </button>
            )}
          </div>
        </div>
      </section>

      {loading && <LoadingState label="Loading news…" />}
      {error && <ErrorState error={error} onRetry={() => setSymbol(symbol)} />}
      {!loading && !error && <NewsPanel news={news} />}
    </div>
  );
}
