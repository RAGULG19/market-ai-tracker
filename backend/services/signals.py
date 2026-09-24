"""Explainable BUY / SELL / HOLD signal built from explicit rules.

Every factor is a plain-language, checkable rule based on computed
indicators or the model forecast. No guaranteed-outcome language is used.
"""
from services.helpers import json_safe

DISCLAIMER = "Market analysis is informational and not financial advice."


def _pct_above(value, ref):
    return (value / ref - 1.0) * 100.0 if ref else 0.0


def build_signal(overview, ind, forecast):
    """Return an explainable signal dict.

    overview : dict from market_data.get_overview
    ind      : dict from indicators.compute_indicators (uses ["latest"])
    forecast : dict from ml.train_and_forecast (optional -> may be None)
    """
    price = overview.get("current_price") or 0.0
    L = ind["latest"] if ind else {}
    supporting, conflicting = [], []

    def feat(cond, ok_msg, warn_msg, ok_side="supporting"):
        if cond:
            (supporting if ok_side == "supporting" else conflicting).append(ok_msg)
        else:
            conflicting.append(warn_msg)

    # --- trend context ---------------------------------------------------
    if price and L.get("sma50"):
        if price > L["sma50"]:
            supporting.append(
                "Price above SMA50 (%s > %s) — medium-term uptrend"
                % (json_safe(price, 2), L["sma50"])
            )
        else:
            conflicting.append(
                "Price below SMA50 (%s < %s) — medium-term downtrend"
                % (json_safe(price, 2), L["sma50"])
            )
    if price and L.get("sma200"):
        if price > L["sma200"]:
            supporting.append("Price above SMA200 — long-term trend positive")
        else:
            conflicting.append("Price below SMA200 — long-term trend negative")

    if L.get("ema20") and L.get("ema50"):
        if L["ema20"] > L["ema50"]:
            supporting.append("EMA20 above EMA50 — bullish momentum")
        else:
            conflicting.append("EMA20 below EMA50 — bearish momentum")

    # --- RSI ---------------------------------------------------------------
    rsi = L.get("rsi")
    if rsi is not None:
        if rsi > 70:
            conflicting.append("RSI = %.1f — overbought (pullback risk)" % rsi)
        elif rsi < 30:
            conflicting.append("RSI = %.1f — oversold, weak momentum" % rsi)
        elif 40 <= rsi <= 70:
            supporting.append("RSI = %.1f — healthy momentum" % rsi)
        else:
            conflicting.append("RSI = %.1f — weak momentum zone" % rsi)

    # --- MACD ---------------------------------------------------------------
    if L.get("macd_hist") is not None:
        if L["macd_hist"] > 0:
            supporting.append("MACD histogram positive — bullish momentum")
        else:
            conflicting.append("MACD histogram negative — bearish momentum")

    # --- Volume ---------------------------------------------------------------
    if L.get("volume") and L.get("volume_avg20"):
        if L["volume"] > L["volume_avg20"]:
            supporting.append("Volume above 20-day average — move confirmed")
        else:
            conflicting.append("Volume below 20-day average — weak confirmation")

    # --- Volatility / structure ---------------------------------------------
    vol = L.get("volatility_ann_pct")
    if vol is not None:
        if vol > 45:
            conflicting.append(
                "High annualized volatility (%.1f%%) — elevated risk" % vol
            )
        elif vol < 15:
            supporting.append(
                "Contained volatility (%.1f%%) — stable price action" % vol
            )

    res = L.get("resistance_20") or L.get("resistance_60")
    if price and res and res > price:
        dist = _pct_above(res, price)
        if dist < 2.0:
            conflicting.append(
                "Resistance nearby at %s (+%.1f%%)" % (res, dist)
            )
    sup = L.get("support_20") or L.get("support_60")
    if price and sup and sup < price:
        dist = _pct_above(price, sup)
        if dist < 2.0:
            supporting.append(
                "Support nearby at %s (-%.1f%%) — cushion below" % (sup, dist)
            )

    # --- Model forecast -------------------------------------------------------
    if forecast:
        pct = forecast.get("expected_change_pct")
        if pct is not None:
            if pct > 1.0:
                supporting.append(
                    "Model forecast +% .1f%% over %d days"
                    % (pct, forecast.get("horizon_days", 14))
                )
            elif pct < -1.0:
                conflicting.append(
                    "Model forecast %.1f%% over %d days"
                    % (pct, forecast.get("horizon_days", 14))
                )

    score = len(supporting) - len(conflicting)
    if score >= 2:
        signal = "BUY"
    elif score <= -2:
        signal = "SELL"
    else:
        signal = "HOLD"

    summary = "%d supporting vs %d conflicting factors (score %+d)." % (
        len(supporting),
        len(conflicting),
        score,
    )
    return {
        "signal": signal,
        "score": score,
        "summary": summary,
        "supporting": supporting,
        "conflicting": conflicting,
        "rules": (
            "Rule-based composite of trend (SMA20/50/200, EMA20/50), RSI, "
            "MACD, volume, volatility, support/resistance proximity and the "
            "model forecast. BUY if score >= +2, SELL if <= -2, else HOLD."
        ),
        "disclaimer": DISCLAIMER,
    }
