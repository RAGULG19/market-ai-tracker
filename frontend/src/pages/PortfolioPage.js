import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import { toast } from "../services/toast";
import useLocalStorage from "../hooks/useLocalStorage";
import PortfolioPanel from "../components/PortfolioPanel";

const EMPTY_FORM = { symbol: "", quantity: "", buyPrice: "" };

/**
 * Portfolio tracker (localStorage only — no accounts, no credentials).
 * Current prices come from the public market-data API.
 */
export default function PortfolioPage() {
  const [holdings, setHoldings] = useLocalStorage("mat_portfolio", []);
  const [quotes, setQuotes] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const refreshQuotes = useCallback(() => {
    holdings.forEach((h) => {
      if (quotes[h.symbol]) return;
      api
        .stock(h.symbol)
        .then((data) =>
          setQuotes((q) => ({ ...q, [h.symbol]: data.overview }))
        )
        .catch(() => {
          /* leave at buy price if quote unavailable */
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings]);

  useEffect(() => {
    refreshQuotes();
  }, [refreshQuotes]);

  const addHolding = (e) => {
    e.preventDefault();
    const symbol = form.symbol.trim().toUpperCase();
    const quantity = Number(form.quantity);
    const buyPrice = Number(form.buyPrice);
    if (!symbol) return toast("Symbol is required.", "warning");
    if (!(quantity > 0)) return toast("Quantity must be greater than 0.", "warning");
    if (!(buyPrice > 0)) return toast("Buy price must be greater than 0.", "warning");
    if (holdings.some((h) => h.symbol === symbol)) {
      return toast(`${symbol} is already in the portfolio.`, "warning");
    }
    setHoldings([...holdings, { symbol, quantity, buyPrice }]);
    setForm(EMPTY_FORM);
    setShowForm(false);
    toast(`${symbol} added to portfolio.`, "success");
  };

  const removeHolding = (symbol) => {
    setHoldings(holdings.filter((h) => h.symbol !== symbol));
    toast(`${symbol} removed.`, "info");
  };

  return (
    <div className="portfolio-page">
      {showForm ? (
        <form className="card holding-form" onSubmit={addHolding}>
          <h3 className="card-title">Add holding</h3>
          <div className="form-row">
            <label htmlFor="pf-symbol">
              Symbol
              <input
                id="pf-symbol"
                type="text"
                list="pf-symbols"
                placeholder="e.g. TCS.NS or AAPL"
                value={form.symbol}
                onChange={(e) =>
                  setForm((f) => ({ ...f, symbol: e.target.value }))
                }
              />
            </label>
            <label htmlFor="pf-qty">
              Quantity
              <input
                id="pf-qty"
                type="number"
                min="0.0001"
                step="any"
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quantity: e.target.value }))
                }
              />
            </label>
            <label htmlFor="pf-price">
              Buy price
              <input
                id="pf-price"
                type="number"
                min="0.0001"
                step="any"
                value={form.buyPrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, buyPrice: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Add
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            + Add holding
          </button>
        </div>
      )}

      <PortfolioPanel
        holdings={holdings}
        quotes={quotes}
        onRemove={removeHolding}
        onAdd={() => setShowForm(true)}
      />

      <div className="card">
        <p className="disclaimer">
          Portfolio values are informational estimates based on delayed market
          data. No brokerage accounts or credentials are used. Not financial
          advice.
        </p>
      </div>
    </div>
  );
}
