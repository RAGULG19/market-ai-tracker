"""Technical indicators computed with the `ta` library (already a project
dependency) on top of pandas.

compute_indicators(df) returns:
  {
    "latest": {...single values for cards/signals...},
    "series": {...arrays aligned to `dates` for chart overlays/panels...},
    "dates":  [ISO date strings],
  }

Series are truncated to `chart_limit` most recent points to keep payloads
small. Missing values (e.g. EMA200 on short history) become None, never NaN.
"""
import pandas as pd
from ta.momentum import RSIIndicator, StochasticOscillator
from ta.trend import EMAIndicator, MACD, SMAIndicator
from ta.volatility import AverageTrueRange, BollingerBands
from ta.volume import OnBalanceVolumeIndicator

from services.helpers import fmt_dates, json_safe


def compute_indicators(df, interval="1d", chart_limit=260):
    close = df["Close"].astype(float)
    high = df["High"].astype(float)
    low = df["Low"].astype(float)
    volume = df["Volume"].fillna(0).astype(float)

    sma20 = SMAIndicator(close, 20).sma_indicator()
    sma50 = SMAIndicator(close, 50).sma_indicator()
    sma200 = SMAIndicator(close, 200).sma_indicator()
    ema20 = EMAIndicator(close, 20).ema_indicator()
    ema50 = EMAIndicator(close, 50).ema_indicator()
    ema200 = EMAIndicator(close, 200).ema_indicator()
    rsi = RSIIndicator(close, 14).rsi()

    # ta's MACD uses a fixed 9-period signal line internally.
    macd_ind = MACD(close, window_slow=26, window_fast=12)
    macd_line = macd_ind.macd()
    macd_signal = macd_ind.macd_signal()
    macd_hist = macd_ind.macd_diff()

    bb = BollingerBands(close, window=20, window_dev=2)
    bb_upper = bb.bollinger_hband()
    bb_lower = bb.bollinger_lband()
    bb_mid = bb.bollinger_mavg()

    atr = AverageTrueRange(high, low, close, window=14).average_true_range()
    stoch = StochasticOscillator(high, low, close, window=14, smooth_window=3)
    stoch_k = stoch.stoch()
    stoch_d = stoch.stoch_signal()
    obv = OnBalanceVolumeIndicator(close, volume).on_balance_volume()
    vol_sma20 = volume.rolling(20).mean()

    daily_ret = close.pct_change()
    volatility_ann = daily_ret.rolling(20).std() * (252 ** 0.5) * 100

    # Support / resistance from rolling extremes (last 20 and 60 sessions).
    support_20 = low.rolling(20).min()
    resist_20 = high.rolling(20).max()
    support_60 = low.rolling(60).min()
    resist_60 = high.rolling(60).max()

    last = df.index[-1]
    latest = {
        "rsi": json_safe(rsi.iloc[-1], 2),
        "sma20": json_safe(sma20.iloc[-1]),
        "sma50": json_safe(sma50.iloc[-1]),
        "sma200": json_safe(sma200.iloc[-1]),
        "ema20": json_safe(ema20.iloc[-1]),
        "ema50": json_safe(ema50.iloc[-1]),
        "ema200": json_safe(ema200.iloc[-1]),
        "macd": json_safe(macd_line.iloc[-1]),
        "macd_signal": json_safe(macd_signal.iloc[-1]),
        "macd_hist": json_safe(macd_hist.iloc[-1]),
        "bb_upper": json_safe(bb_upper.iloc[-1]),
        "bb_mid": json_safe(bb_mid.iloc[-1]),
        "bb_lower": json_safe(bb_lower.iloc[-1]),
        "atr": json_safe(atr.iloc[-1]),
        "atr_pct": json_safe(atr.iloc[-1] / close.iloc[-1] * 100, 2),
        "stoch_k": json_safe(stoch_k.iloc[-1], 2),
        "stoch_d": json_safe(stoch_d.iloc[-1], 2),
        "obv": json_safe(obv.iloc[-1], 0),
        "volume": json_safe(volume.iloc[-1], 0),
        "volume_avg20": json_safe(vol_sma20.iloc[-1], 0),
        "volatility_ann_pct": json_safe(volatility_ann.iloc[-1], 1),
        "support_20": json_safe(support_20.loc[:last].iloc[-1]),
        "resistance_20": json_safe(resist_20.loc[:last].iloc[-1]),
        "support_60": json_safe(support_60.loc[:last].iloc[-1]),
        "resistance_60": json_safe(resist_60.loc[:last].iloc[-1]),
        "as_of": fmt_dates([last], interval)[0],
    }

    tail = slice(-chart_limit, None)
    dates = fmt_dates(df.index[tail], interval)
    series = {
        "sma20": [json_safe(v) for v in sma20.iloc[tail]],
        "sma50": [json_safe(v) for v in sma50.iloc[tail]],
        "sma200": [json_safe(v) for v in sma200.iloc[tail]],
        "ema20": [json_safe(v) for v in ema20.iloc[tail]],
        "ema50": [json_safe(v) for v in ema50.iloc[tail]],
        "ema200": [json_safe(v) for v in ema200.iloc[tail]],
        "bb_upper": [json_safe(v) for v in bb_upper.iloc[tail]],
        "bb_lower": [json_safe(v) for v in bb_lower.iloc[tail]],
        "rsi": [json_safe(v, 2) for v in rsi.iloc[tail]],
        "macd": [json_safe(v) for v in macd_line.iloc[tail]],
        "macd_signal": [json_safe(v) for v in macd_signal.iloc[tail]],
        "macd_hist": [json_safe(v) for v in macd_hist.iloc[tail]],
        "volume": [json_safe(v, 0) for v in volume.iloc[tail]],
        "volume_avg20": [json_safe(v, 0) for v in vol_sma20.iloc[tail]],
    }
    return {"latest": latest, "series": series, "dates": dates}
