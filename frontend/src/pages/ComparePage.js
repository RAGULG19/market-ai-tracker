import { useEffect, useState } from "react";
import api from "../services/api";
import { toast } from "../services/toast";
import SearchBar from "../components/SearchBar";
import ComparisonTable from "../components/ComparisonTable";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";

/** Compare up to 6 instruments across price, indicators, forecast, signal. */
export default function ComparePage({ symbols, setSymbols, onOpen }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = (list) => {
    if (!list || list.length < 2) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .compare(list)
      .then((res) => {
        setData(res);
        (res.errors || []).forEach((e) =>
          toast(`${e.symbol}: ${e.error}`, "warning")
        );
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(symbols);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols]);

  const addSymbol = (sym) => {
    if (symbols.includes(sym)) {
      toast(`${sym} is already in the comparison.`, "info");
      return;
    }
    if (symbols.length >= 6) {
      toast("You can compare at most 6 symbols.", "warning");
      return;
    }
    setSymbols([...symbols, sym]);
  };

  const removeSymbol = (sym) => {
    setSymbols(symbols.filter((s) => s !== sym));
  };

  return (
    <div className="compare-page">
      <section className="card">
        <div className="compare-add">
          <SearchBar onSelect={addSymbol} />
          <div className="chip-row">
            {symbols.map((s) => (
              <span className="chip" key={s}>
                {s}
                <button
                  type="button"
                  aria-label={`Remove ${s}`}
                  onClick={() => removeSymbol(s)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <p className="chart-note">
          Add 2–6 symbols to compare technicals, model forecasts and signals
          side by side.
        </p>
      </section>

      {symbols.length < 2 && (
        <div className="card empty-card">
          <p className="empty-state">
            Add at least two symbols (e.g. TCS.NS, INFY.NS, RELIANCE.NS,
            HDFCBANK.NS).
          </p>
        </div>
      )}

      {loading && <LoadingState label="Running comparison…" rows={3} />}
      {!loading && error && <ErrorState error={error} onRetry={() => load(symbols)} />}
      {!loading && !error && data && (
        <>
          <ComparisonTable
            results={data.results}
            onRemove={removeSymbol}
            onOpen={onOpen}
          />
          {(data.errors || []).length > 0 && (
            <div className="card">
              <p className="empty-state">
                {data.errors.map((e) => `${e.symbol}: ${e.error}`).join(" · ")}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
