"""Market data access layer (yfinance) with a small in-memory TTL cache.

Responsibilities:
  * download/flatten OHLCV history (handles yfinance MultiIndex columns)
  * chart history endpoint payloads (dates/OHLC/volume)
  * stock overview (price, change, 52-week range, market cap, currency...)
  * friendly, non-fabricated errors for invalid/unsupported symbols
"""
import threading
import time

import pandas as pd
import yfinance as yf

from config import (
    CACHE_TTL_HISTORY,
    CACHE_TTL_OVERVIEW,
    currency_for,
    display_name,
    exchange_guess,
)
from services.helpers import ApiError, fmt_dates, json_safe

_lock = threading.Lock()
_cache = {}

# Supported chart ranges -> (yfinance period, interval)
RANGE_MAP = {
    "1d": ("1d", "5m"),
    "5d": ("5d", "15m"),
    "1mo": ("1mo", "1d"),
    "3mo": ("3mo", "1d"),
    "6mo": ("6mo", "1d"),
    "1y": ("1y", "1d"),
    "2y": ("2y", "1d"),
    "5y": ("5y", "1d"),
}


def _cache_get(key, ttl):
    with _lock:
        entry = _cache.get(key)
    if entry and (time.time() - entry[0]) < ttl:
        return entry[1]
    return None


def _cache_set(key, value):
    with _lock:
        if len(_cache) > 512:
            _cache.clear()
        _cache[key] = (time.time(), value)


def flatten_ohlc(raw):
    """Normalize a yfinance download into a flat-column DataFrame."""
    if raw is None or len(raw) == 0:
        return pd.DataFrame()
    df = raw.copy()
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df = df.loc[:, ~df.columns.duplicated()]
    required = ["Open", "High", "Low", "Close"]
    if any(c not in df.columns for c in required):
        return pd.DataFrame()
    if "Volume" not in df.columns:
        df["Volume"] = 0.0
    df = df.dropna(subset=["Close"])
    return df


def download(symbol, period="1y", interval="1d"):
    """Download OHLCV history (cached). Raises ApiError on failure/empty."""
    key = ("hist", symbol, period, interval)
    cached = _cache_get(key, CACHE_TTL_HISTORY)
    if cached is not None:
        return cached
    try:
        raw = yf.download(
            tickers=symbol,
            period=period,
            interval=interval,
            progress=False,
            threads=False,
            auto_adjust=True,
        )
    except Exception as exc:
        raise ApiError("Market data provider request failed: %s" % exc, 502)
    df = flatten_ohlc(raw)
    if df.empty:
        raise ApiError(
            'No data found for "%s". The symbol may be invalid or not '
            "supported by the data provider. Indian symbols need a .NS "
            "(NSE) or .BO (BSE) suffix, e.g. TCS.NS." % symbol,
            404,
        )
    _cache_set(key, df)
    return df


def get_history(symbol, range_key="1y"):
    """OHLCV series for charts."""
    period, interval = RANGE_MAP.get(range_key, ("1y", "1d"))
    df = download(symbol, period=period, interval=interval).tail(1500)
    dates = fmt_dates(df.index, interval)

    def col(name, digits=4):
        return [json_safe(v, digits) for v in df[name]]

    return {
        "symbol": symbol,
        "range": range_key,
        "interval": interval,
        "dates": dates,
        "open": col("Open"),
        "high": col("High"),
        "low": col("Low"),
        "close": col("Close"),
        "volume": col("Volume", 0),
    }


def get_overview(symbol):
    """Quote overview with correct currency and exchange metadata."""
    cached = _cache_get(("overview", symbol), CACHE_TTL_OVERVIEW)
    if cached is not None:
        return cached

    hist = download(symbol, period="1y", interval="1d")
    close = hist["Close"].astype(float)
    price = float(close.iloc[-1])
    prev_close = float(close.iloc[-2]) if len(close) > 1 else price
    change = price - prev_close
    change_pct = (change / prev_close * 100.0) if prev_close else 0.0

    info = {}
    try:
        info = yf.Ticker(symbol).info or {}
    except Exception:
        info = {}

    year = hist.tail(252)
    hi52 = info.get("fiftyTwoWeekHigh") or float(year["High"].max())
    lo52 = info.get("fiftyTwoWeekLow") or float(year["Low"].min())
    last = hist.iloc[-1]

    overview = {
        "symbol": symbol,
        "name": info.get("shortName")
        or info.get("longName")
        or display_name(symbol),
        "exchange": info.get("fullExchangeName")
        or info.get("exchange")
        or exchange_guess(symbol),
        "currency": currency_for(symbol, info.get("currency")),
        "quote_type": info.get("quoteType"),
        "market_state": info.get("marketState"),
        "current_price": json_safe(price, 2),
        "previous_close": json_safe(prev_close, 2),
        "change": json_safe(change, 2),
        "change_pct": json_safe(change_pct, 2),
        "open": json_safe(last["Open"], 2),
        "high": json_safe(last["High"], 2),
        "low": json_safe(last["Low"], 2),
        "volume": json_safe(last["Volume"], 0),
        "week52_high": json_safe(hi52, 2),
        "week52_low": json_safe(lo52, 2),
        "market_cap": json_safe(info.get("marketCap"), 0),
        "as_of": fmt_dates([hist.index[-1]], "1d")[0],
    }
    _cache_set(("overview", symbol), overview)
    return overview
