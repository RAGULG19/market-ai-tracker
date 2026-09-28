import { useEffect, useState } from "react";
import api from "../services/api";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import { formatNumber, formatPrice } from "../services/format";

/**
 * Analytics page: transparent model evaluation for the selected symbol —
 * candidate comparison, time-aware validation metrics, uncertainty and
 * confidence methodology, feature list.
 */
export default function AnalyticsPage({ symbol }) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    if (!symbol) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setError(null);
    api
      .predict(symbol)
      .then((data) => active && setForecast(data))
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [symbol]);

  if (!symbol) {
    return (
      <div className="card empty-card">
        <p className="empty-state">
          Select a symbol on the Dashboard first — model evaluation is shown
          per instrument.
        </p>
      </div>
    );
  }
  if (loading) return <LoadingState label="Loading model evaluation…" />;
  if (error) return <ErrorState error={error} />;

  const currency = forecast.currency || "USD";
  const metricRows = [
    ...Object.entries(forecast.models_compared),
    ["Naive baseline (0% change)", forecast.naive_baseline],
  ];
  const isBest = (name) => name === forecast.model;

  return (
    <div className="analytics-page">
      <section className="card">
        <h2 className="page-title">Model evaluation · {symbol}</h2>
        <div className="method-grid">
          <div className="method-item">
            <h4>Task</h4>
            <p>
              {forecast.horizon_days}-day ahead return forecasting from
              lagged returns, volatility, RSI, MACD, trend distances, volume
              z-score and range position.
            </p>
          </div>
          <div className="method-item">
            <h4>Validation</h4>
            <p>{forecast.validation}</p>
          </div>
          <div className="method-item">
            <h4>Uncertainty</h4>
            <p>{forecast.uncertainty.method}</p>
          </div>
          <div className="method-item">
            <h4>Confidence</h4>
            <p>{forecast.confidence_method}</p>
          </div>
        </div>
      </section>

      <section className="card table-card">
        <h3 className="card-title">
          Candidate comparison (selected: {forecast.model})
        </h3>
        <div className="table-scroll">
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">MAE</th>
                <th scope="col">RMSE</th>
                <th scope="col">MAPE</th>
                <th scope="col">Dir. accuracy</th>
                <th scope="col">Residual σ</th>
                <th scope="col">Eval samples</th>
              </tr>
            </thead>
            <tbody>
              {metricRows.map(([name, m]) => (
                <tr key={name} className={isBest(name) ? "row-best" : ""}>
                  <th scope="row">
                    {name}
                    {isBest(name) && <span className="best-tag">selected</span>}
                  </th>
                  <td>{formatPrice(m.mae, currency)}</td>
                  <td>{formatPrice(m.rmse, currency)}</td>
                  <td>{formatNumber(m.mape_pct, 2)}%</td>
                  <td>{formatNumber(m.directional_accuracy_pct, 1)}%</td>
                  <td>{formatNumber(m.residual_sigma_pct, 2)}%</td>
                  <td>{m.n_eval}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="chart-note">
          All metrics are out-of-fold from time-series validation. The naive
          baseline predicts “no change” and exists for honest comparison.
        </p>
      </section>

      <section className="card">
        <h3 className="card-title">Forecast</h3>
        <dl className="fact-list columns-2">
          <div>
            <dt>Point forecast</dt>
            <dd>
              {formatPrice(forecast.forecast_price, currency)} (
              {forecast.expected_change_pct > 0 ? "+" : ""}
              {formatNumber(forecast.expected_change_pct, 2)}%)
            </dd>
          </div>
          <div>
            <dt>95% prediction interval</dt>
            <dd>
              {formatPrice(forecast.uncertainty.horizon_lower, currency)} –{" "}
              {formatPrice(forecast.uncertainty.horizon_upper, currency)}{" "}
              (width {formatNumber(forecast.uncertainty.interval_width_pct, 1)}%)
            </dd>
          </div>
          <div>
            <dt>Model confidence</dt>
            <dd>{forecast.model_confidence} / 100</dd>
          </div>
          <div>
            <dt>Training samples</dt>
            <dd>
              {forecast.train_samples} of {forecast.history_sessions} sessions
            </dd>
          </div>
        </dl>
        <details className="signal-rules">
          <summary>Features used ({forecast.features.length})</summary>
          <p className="feature-list">{forecast.features.join(", ")}</p>
        </details>
        <p className="disclaimer">{forecast.disclaimer}</p>
      </section>
    </div>
  );
}
