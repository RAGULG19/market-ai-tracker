import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import { toast } from "../services/toast";
import StockOverview from "../components/StockOverview";
import IndicatorCards from "../components/IndicatorCards";
import SignalCard from "../components/SignalCard";
import PriceChart from "../components/PriceChart";
import IndicatorPanels from "../components/IndicatorPanels";
import PredictionChart from "../components/PredictionChart";
import NewsPanel from "../components/NewsPanel";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import {
  changeClass,
  formatNumber,
  formatPct,
  formatPrice,
} from "../services/format";

const DEFAULT_OVERLAYS = {
  sma20: true,
  sma50: true,
  bb: false,
  ema20: false,
  ema50: false,
  ema200: false,
};

/** Full analysis view for the selected symbol. */
export default function DashboardPage({ symbol }) {
  const [stock, setStock] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [news, setNews] = useState(null);
  const [range, setRange] = useState("6mo");
  const [history, setHistory] = useState(null);
  const [indicatorData, setIndicatorData] = useState(null);
  const [chartType, setChartType] = useState("candlestick");
  const [overlays, setOverlays] = useState(DEFAULT_OVERLAYS);
  const [panels, setPanels] = useState({ rsi: true, macd: true, volume: true });
  const [loading, setLoading] = useState({ main: true, range: false });
  const [error, setError] = useState(null);

  const loadMain = useCallback(() => {
    if (!symbol) return;
    setLoading((l) => ({ ...l, main: true }));
    setError(null);
    let active = true;
    api.stock(symbol)
      .then((data) => {
        if (active) setStock(data);
      })
      .catch((err) => {
        if (active) {
          setError(err);
          toast(err.message, "error");
        }
      })
      .finally(() => {
        if (active) setLoading((l) => ({ ...l, main: false }));
      });
    api.predict(symbol)
      .then((data) => active && setForecast(data))
      .catch((err) => active && toast(`Forecast unavailable: ${err.message}`, "warning"));
    api.news(symbol)
      .then((data) => active && setNews(data))
      .catch(() => active && setNews(null));
    return () => {
      active = false;
    };
  }, [symbol]);

  const loadRange = useCallback(() => {
    if (!symbol) return;
    setLoading((l) => ({ ...l, range: true }));
    let active = true;
    Promise.all([
      api.history(symbol, range),
      api.indicators(symbol, range).catch(() => null),
    ])
      .then(([hist, ind]) => {
        if (active) {
          setHistory(hist);
          setIndicatorData(ind);
        }
      })
      .catch((err) => {
        toast(`Chart data failed: ${err.message}`, "error");
      })
      .finally(() => active && setLoading((l) => ({ ...l, range: false })));
    return () => {
      active = false;
    };
  }, [symbol, range]);

  useEffect(() => {
    return loadMain();
  }, [loadMain]);

  useEffect(() => {
    return loadRange();
  }, [loadRange]);

  if (!symbol) {
    return (
      <div className="card empty-card">
        <p className="empty-state">
          Search for a symbol above (e.g. TCS, INFY, RELIANCE, AAPL) to start
          the analysis.
        </p>
      </div>
    );
  }

  if (loading.main && !stock) {
    return <LoadingState label={`Analyzing ${symbol}…`} rows={4} />;
  }
  if (error) return <ErrorState error={error} onRetry={loadMain} />;

  const overview = stock ? stock.overview : null;
  const currency = overview ? overview.currency : "USD";

  return (
    <div className="dashboard">
      {overview && (
        <StockOverview overview={overview} indicators={stock.indicators} />
      )}

      <div className="dashboard-grid">
        <PriceChart
          history={history}
          indicators={indicatorData}
          currency={currency}
          chartType={chartType}
          onChartTypeChange={setChartType}
          range={range}
          onRangeChange={setRange}
          overlays={overlays}
          onToggleOverlay={(id) =>
            setOverlays((o) => ({ ...o, [id]: !o[id] }))
          }
        />

        <div className="side-column">
          {forecast && (
            <section
              className="card forecast-facts"
              aria-label="Forecast summary"
            >
              <h3 className="card-title">AI forecast</h3>
              <dl className="fact-list">
                <div>
                  <dt>Current price</dt>
                  <dd>{formatPrice(forecast.current_price, currency)}</dd>
                </div>
                <div>
                  <dt>Forecast price ({forecast.horizon_days}d)</dt>
                  <dd>{formatPrice(forecast.forecast_price, currency)}</dd>
                </div>
                <div>
                  <dt>Expected change</dt>
                  <dd className={changeClass(forecast.expected_change_pct)}>
                    {formatPrice(forecast.expected_change, currency)} (
                    {formatPct(forecast.expected_change_pct)})
                  </dd>
                </div>
                <div>
                  <dt>Model</dt>
                  <dd>{forecast.model}</dd>
                </div>
                <div>
                  <dt>Validation MAE</dt>
                  <dd>{formatPrice(forecast.metrics.mae, currency)}</dd>
                </div>
                <div>
                  <dt>Directional accuracy</dt>
                  <dd>
                    {formatNumber(
                      forecast.metrics.directional_accuracy_pct,
                      1
                    )}
                    %
                  </dd>
                </div>
                <div>
                  <dt>95% interval</dt>
                  <dd>
                    {formatPrice(forecast.uncertainty.horizon_lower, currency)}{" "}
                    – {formatPrice(forecast.uncertainty.horizon_upper, currency)}
                  </dd>
                </div>
                <div>
                  <dt>Model confidence</dt>
                  <dd title={forecast.confidence_method}>
                    {forecast.model_confidence} / 100
                  </dd>
                </div>
              </dl>
              <p className="chart-note" title={forecast.confidence_method}>
                Confidence is a documented composite of out-of-fold accuracy —
                not a probability.
              </p>
              <p className="disclaimer">{forecast.disclaimer}</p>
            </section>
          )}

          {stock && <SignalCard signal={stock.signal} />}
        </div>
      </div>

      <div
        className="panel-toggles"
        role="group"
        aria-label="Indicator panels"
      >
        {["rsi", "macd", "volume"].map((p) => (
          <label key={p} className={`overlay-chip ${panels[p] ? "on" : ""}`}>
            <input
              type="checkbox"
              checked={panels[p]}
              onChange={() => setPanels((s) => ({ ...s, [p]: !s[p] }))}
            />
            {p.toUpperCase()}
          </label>
        ))}
      </div>

      <IndicatorPanels indicators={indicatorData} show={panels} />

      <div className="two-col">
        {forecast && (
          <PredictionChart forecast={forecast} currency={currency} />
        )}
        <NewsPanel news={news} />
      </div>

      <IndicatorCards indicators={stock ? stock.indicators : null} />
    </div>
  );
}
