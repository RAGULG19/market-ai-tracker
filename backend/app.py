"""Market AI Tracker — Flask backend.

REST-style routes:
  GET /                     legacy health text (unchanged)
  GET /health               JSON health check
  GET /watchlists           curated symbol lists for the search UI
  GET /search?q=            symbol search suggestions
  GET /stock/<symbol>       overview + indicators + explainable signal
  GET /history/<symbol>     OHLCV for charts (?range=1d..5y)
  GET /indicators/<symbol>  indicator values + aligned series (?range=)
  GET /predict/<symbol>     ML forecast + evaluation (?days=7|14|30)
  GET /signal/<symbol>      explainable BUY/SELL/HOLD
  GET /news/<symbol>        real headlines + lexicon sentiment
  GET /news?q=              market news
  GET /compare?symbols=A,B  multi-symbol comparison snapshot
  GET /predict?ticker=X     LEGACY endpoint kept for the deployed frontend
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
from concurrent.futures import ThreadPoolExecutor, as_completed

from config import (
    CACHE_TTL_PREDICT,
    CORS_ORIGINS,
    DEFAULT_FORECAST_DAYS,
    resolve_symbol,
)
from services import indicators, market_data, ml, news, search, signals
from services.helpers import ApiError
from services.market_data import _cache_get, _cache_set

app = Flask(__name__)
if CORS_ORIGINS.strip() == "*":
    CORS(app)
else:
    CORS(app, origins=[o.strip() for o in CORS_ORIGINS.split(",") if o.strip()])


# ---------------------------------------------------------------- errors ---
@app.errorhandler(ApiError)
def handle_api_error(exc):
    return jsonify({"error": exc.message}), exc.status


@app.errorhandler(404)
def handle_404(_exc):
    return jsonify({"error": "Endpoint not found."}), 404


@app.errorhandler(405)
def handle_405(_exc):
    return jsonify({"error": "Method not allowed."}), 405


@app.errorhandler(500)
def handle_500(_exc):
    return jsonify({"error": "Internal server error."}), 500


# -------------------------------------------------------------- helpers ----
def _clean_symbol(raw):
    sym = resolve_symbol(raw)
    if not sym:
        raise ApiError("Ticker is required.", 400)
    return sym


def _horizon():
    raw = request.args.get(
        "days", request.args.get("horizon", DEFAULT_FORECAST_DAYS)
    )
    try:
        h = int(raw)
    except (TypeError, ValueError):
        raise ApiError("days must be an integer between 1 and 60.", 400)
    if h < 1 or h > 60:
        raise ApiError("days must be an integer between 1 and 60.", 400)
    return h


def _range():
    key = request.args.get("range", "1y")
    if key not in market_data.RANGE_MAP:
        raise ApiError(
            "Unsupported range. Use one of: %s"
            % ", ".join(market_data.RANGE_MAP),
            400,
        )
    return key


def get_forecast(symbol, horizon):
    """Cached ML forecast (models are retrained only every cache TTL)."""
    key = ("predict", symbol, horizon)
    cached = _cache_get(key, CACHE_TTL_PREDICT)
    if cached is not None:
        return cached
    hist = market_data.download(symbol, period="2y", interval="1d")
    forecast = ml.train_and_forecast(hist, horizon=horizon)
    forecast = dict(forecast)
    forecast["symbol"] = symbol
    _cache_set(key, forecast)
    return forecast


# --------------------------------------------------------------- routes ----
@app.route("/")
def home():
    # Legacy health text kept exactly as the deployed frontend expects it.
    return "✅ Market AI Tracker Backend Running"


@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "market-ai-tracker"})


@app.route("/watchlists")
def watchlists():
    return jsonify({"watchlists": search.get_watchlists()})


@app.route("/search")
def search_route():
    q = request.args.get("q", "")
    if not q.strip():
        return jsonify({"results": []})
    try:
        limit = min(int(request.args.get("limit", 10)), 25)
    except ValueError:
        limit = 10
    return jsonify({"results": search.search_symbols(q, limit=limit)})


@app.route("/stock/<symbol>")
def stock(symbol):
    sym = _clean_symbol(symbol)
    overview = market_data.get_overview(sym)
    hist = market_data.download(sym, period="1y", interval="1d")
    ind = indicators.compute_indicators(hist, interval="1d")
    forecast = get_forecast(sym, _horizon())
    signal = signals.build_signal(overview, ind, forecast)
    return jsonify(
        {
            "overview": overview,
            "indicators": ind["latest"],
            "signal": signal,
        }
    )


@app.route("/history/<symbol>")
def history(symbol):
    sym = _clean_symbol(symbol)
    return jsonify(market_data.get_history(sym, _range()))


@app.route("/indicators/<symbol>")
def indicators_route(symbol):
    sym = _clean_symbol(symbol)
    range_key = _range()
    period, interval = market_data.RANGE_MAP[range_key]
    df = market_data.download(sym, period=period, interval=interval).tail(1500)
    ind = indicators.compute_indicators(
        df, interval=interval, chart_limit=1500
    )
    return jsonify(
        {
            "symbol": sym,
            "range": range_key,
            "dates": ind["dates"],
            "latest": ind["latest"],
            "series": ind["series"],
        }
    )


@app.route("/predict/<symbol>")
def predict_symbol(symbol):
    sym = _clean_symbol(symbol)
    return jsonify(get_forecast(sym, _horizon()))


@app.route("/signal/<symbol>")
def signal_route(symbol):
    sym = _clean_symbol(symbol)
    overview = market_data.get_overview(sym)
    hist = market_data.download(sym, period="1y", interval="1d")
    ind = indicators.compute_indicators(hist, interval="1d")
    forecast = get_forecast(sym, _horizon())
    return jsonify(signals.build_signal(overview, ind, forecast))


@app.route("/news/<symbol>")
def news_symbol(symbol):
    sym = _clean_symbol(symbol)
    limit = _news_limit()
    return jsonify(news.fetch_news(symbol=sym, limit=limit))


@app.route("/news")
def news_market():
    limit = _news_limit()
    return jsonify(
        news.fetch_news(
            query=request.args.get("q", "stock market"), limit=limit
        )
    )


def _news_limit():
    try:
        return min(max(int(request.args.get("limit", 8)), 1), 20)
    except ValueError:
        return 8


@app.route("/compare")
def compare():
    raw = request.args.get("symbols", "")
    symbols = [_clean_symbol(s) for s in raw.split(",") if s.strip()]
    if len(symbols) < 2:
        raise ApiError("Provide at least two symbols (symbols=A,B).", 400)
    if len(symbols) > 6:
        raise ApiError("You can compare at most 6 symbols at once.", 400)

    horizon = _horizon()
    def load_comparison(sym):
        overview = market_data.get_overview(sym)
        hist = market_data.download(sym, period="1y", interval="1d")
        ind = indicators.compute_indicators(hist, interval="1d")
        forecast = get_forecast(sym, horizon)
        signal = signals.build_signal(overview, ind, forecast)
        return {
            "symbol": sym,
            "name": overview["name"],
            "currency": overview["currency"],
            "current_price": overview["current_price"],
            "change_pct": overview["change_pct"],
            "indicators": ind["latest"],
            "forecast": {
                "model": forecast["model"],
                "forecast_price": forecast["forecast_price"],
                "expected_change_pct": forecast["expected_change_pct"],
                "direction": forecast["direction"],
                "model_confidence": forecast["model_confidence"],
                "horizon_days": forecast["horizon_days"],
            },
            "signal": signal,
        }

    results_by_symbol, errors = {}, []
    with ThreadPoolExecutor(max_workers=min(4, len(symbols))) as executor:
        futures = {executor.submit(load_comparison, sym): sym for sym in symbols}
        for future in as_completed(futures):
            sym = futures[future]
            try:
                results_by_symbol[sym] = future.result()
            except ApiError as exc:
                errors.append({"symbol": sym, "error": exc.message})

    results = [results_by_symbol[sym] for sym in symbols if sym in results_by_symbol]
    return jsonify({"results": results, "errors": errors})


# ------------------------------------------- LEGACY /predict?ticker= -------
@app.route("/predict", methods=["GET"])
def predict_legacy():
    """Original endpoint shape — kept so the deployed frontend keeps working.

    Upgrades over the old implementation (same keys, honest values):
      * confidence is now a documented model-confidence score (was random)
      * signal can be BUY/SELL/HOLD with explainable factors
      * predictions come from purged time-series validated models
      * added dates/currency/metrics keys (additive, non-breaking)
    """
    ticker = request.args.get("ticker")
    if not ticker:
        return jsonify({"error": "Ticker is required"}), 400
    sym = _clean_symbol(ticker)
    horizon = _horizon()

    overview = market_data.get_overview(sym)
    hist = market_data.download(sym, period="2y", interval="1d")
    ind = indicators.compute_indicators(hist, interval="1d")
    forecast = get_forecast(sym, horizon)
    signal = signals.build_signal(overview, ind, forecast)

    L = ind["latest"]
    price = overview["current_price"]
    trend = "UP" if forecast["expected_change_pct"] >= 0 else "DOWN"

    if L["rsi"] is not None:
        if L["rsi"] > 70:
            rsi_signal = "OVERBOUGHT 🔴"
        elif L["rsi"] < 30:
            rsi_signal = "OVERSOLD 🟢"
        else:
            rsi_signal = "NORMAL 🟡"
    else:
        rsi_signal = "N/A"

    tail = hist.tail(14)
    def arr(col):
        from services.helpers import json_safe
        return [json_safe(v, 2) for v in tail[col]]

    reason = (
        "%s (score %+d). %s"
        % (signal["summary"], signal["score"], signal["rules"])
    )
    alert = "Market analysis is informational and not financial advice."

    return jsonify(
        {
            "ticker": sym,
            "current_price": price,
            "currency": overview["currency"],
            "trend": trend,
            "signal": signal["signal"],
            "confidence": forecast["model_confidence"],
            "confidence_label": "Model confidence (see confidence_method)",
            "confidence_method": forecast["confidence_method"],
            "rsi": L["rsi"],
            "rsi_signal": rsi_signal,
            "sma20": L["sma20"],
            "sma50": L["sma50"],
            "reason": reason,
            "alert": alert,
            "predictions": forecast["predictions"],
            "prediction_lower": forecast["lower"],
            "prediction_upper": forecast["upper"],
            "model": forecast["model"],
            "metrics": forecast["metrics"],
            "models_compared": forecast["models_compared"],
            "uncertainty": forecast["uncertainty"],
            "supporting": signal["supporting"],
            "conflicting": signal["conflicting"],
            "ohlc": {
                "open": arr("Open"),
                "high": arr("High"),
                "low": arr("Low"),
                "close": arr("Close"),
            },
        }
    )


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port, debug=False)
