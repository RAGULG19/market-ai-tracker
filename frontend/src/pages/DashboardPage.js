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
  const [overview, setOverview] = useState(null);
  const [summaryIndicators, setSummaryIndicators] = useState(null);
  const [signal, setSignal] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [news, setNews] = useState(null);
  const [range, setRange] = useState("6mo");
  const [history, setHistory] = useState(null);
  const [indicatorData, setIndicatorData] = useState(null);
  const [newsError, setNewsError] = useState(null);
  const [rangeError, setRangeError] = useState(null);
  const [forecastError, setForecastError] = useState(null);
  const [quoteError, setQuoteError] = useState(null);
  const [signalError, setSignalError] = useState(null);
  const [chartType, setChartType] = useState("candlestick");
  const [overlays, setOverlays] = useState(DEFAULT_OVERLAYS);
  const [panels, setPanels] = useState({ rsi: true, macd: true, volume: true });
  const [loading, setLoading] = useState({
    quote: true,
    signal: true,
    range: true,
    forecast: true,
  });

  const loadMain = useCallback(() => {
    if (!symbol) return;
    setLoading((l) => ({ ...l, quote: true, signal: true }));
    setQuoteError(null);
    setSignalError(null);
    setOverview(null);
    setSummaryIndicators(null);
    setSignal(null);
    setNews(null);
    setNewsError(null);
    let active = true;
    api.quoteSummary(symbol)
      .then((data) => {
        if (active) {
          setOverview(data.overview);
          setSummaryIndicators(data.indicators);
        }
      })
      .catch((err) => {
        if (active) setQuoteError(err);
      })
      .finally(() => {
        if (active) setLoading((l) => ({ ...l, quote: false }));
      });
    api.signal(symbol)
      .then((data) => active && setSignal(data))
      .catch((err) => active && setSignalError(err))
      .finally(() =>
        active && setLoading((l) => ({ ...l, signal: false }))
      );
    api.news(symbol)
      .then((data) => active && setNews(data))
      .catch((err) => {
        if (active) setNewsError(err);
      });
    return () => {
      active = false;
    };
  }, [symbol]);

  const loadForecast = useCallback(() => {
    if (!symbol) return;
    setLoading((l) => ({ ...l, forecast: true }));
    setForecast(null);
    setForecastError(null);
    let active = true;
    api.predict(symbol)
      .then((data) => active && setForecast(data))
      .catch((err) => active && setForecastError(err))
      .finally(() =>
        active && setLoading((l) => ({ ...l, forecast: false }))
      );
    return () => {
      active = false;
    };
  }, [symbol]);

  const loadRange = useCallback(() => {
    if (!symbol) return;
    setLoading((l) => ({ ...l, range: true }));
    setHistory(null);
    setIndicatorData(null);
    setRangeError(null);
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
        if (active) {
          setRangeError(err);
          toast(`Chart data failed: ${err.message}`, "error");
        }
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
    return loadForecast();
  }, [loadForecast]);

  useEffect(() => {
    return loadRange();
  }, [loadRange]);

  const toggleOverlay = useCallback((id) => {
    setOverlays((current) => ({ ...current, [id]: !current[id] }));
  }, []);

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

  const currency = overview ? overview.currency : "USD";

  return (
    <div className="dashboard">
      {quoteError ? (
        <ErrorState error={quoteError} onRetry={loadMain} />
      ) : overview ? (
        <StockOverview
          overview={overview}
          indicators={summaryIndicators}
        />
      ) : loading.quote ? (
        <LoadingState label={`Loading ${symbol} quote…`} rows={2} />
      ) : null}
      {rangeError && !history && (
        <ErrorState error={rangeError} onRetry={loadRange} />
      )}

      <div className="dashboard-grid">
        {history ? <PriceChart
          history={history}
          indicators={indicatorData}
          currency={currency}
          chartType={chartType}
          onChartTypeChange={setChartType}
          range={range}
          onRangeChange={setRange}
          overlays={overlays}
          onToggleOverlay={toggleOverlay}
        /> : loading.range ? (
          <LoadingState label={`Loading ${symbol} price history…`} rows={3} />
        ) : null}

        <div className="side-column">
          {forecast ? (
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
          ) : forecastError ? (
            <ErrorState error={forecastError} onRetry={loadForecast} />
          ) : loading.forecast ? (
            <LoadingState label="Calculating forecast…" rows={2} />
          ) : null}

          {signal ? (
            <SignalCard signal={signal} />
          ) : signalError ? (
            <ErrorState error={signalError} onRetry={loadMain} />
          ) : loading.signal ? (
            <LoadingState label="Building market signal…" />
          ) : null}
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

      {loading.range && !indicatorData ? (
        <LoadingState label="Loading technical indicators…" rows={2} />
      ) : <IndicatorPanels indicators={indicatorData} show={panels} />}

      <div className="two-col">
        {forecast && (
          <PredictionChart forecast={forecast} currency={currency} />
        )}
        {news ? <NewsPanel news={news} /> : newsError ? (
          <ErrorState error={newsError} />
        ) : (
          <LoadingState label="Loading market news…" rows={2} />
        )}
      </div>

      {summaryIndicators ? (
        <IndicatorCards indicators={summaryIndicators} />
      ) : loading.quote ? (
        <LoadingState label="Loading indicator summary…" />
      ) : null}
    </div>
  );
}
