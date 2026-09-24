"""ML forecasting pipeline (transparent and leakage-safe).

Methodology:
  Task     : forecast the TOTAL return over the next `horizon` trading days
             using features computed only from data up to day t.
  Models   : Linear Regression (baseline), Random Forest, Gradient Boosting.
  Validation: sklearn TimeSeriesSplit (expanding window, never shuffled)
             with a purged gap of `horizon` rows so overlapping forward
             return windows cannot leak from train into test.
  Metrics  : MAE / RMSE in price terms, MAPE (%), directional accuracy (%),
             plus a naive persistence baseline for reference.
  Uncertainty: 95% prediction interval from the std of out-of-fold residuals
             (1.96 * sigma). NOT a random number.
  Confidence : documented 0-100 composite of directional accuracy, MAPE and
             interval width. It is NOT a probability of profit.
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import TimeSeriesSplit
from ta.momentum import RSIIndicator
from ta.trend import EMAIndicator, MACD, SMAIndicator
from ta.volatility import AverageTrueRange

from services.helpers import ApiError, json_safe

MIN_TRAIN_ROWS = 120
FOLDS = 5
CONFIDENCE_METHOD = (
    "Model confidence = 100 * (0.40 * directional component + "
    "0.35 * MAPE component + 0.25 * interval-width component), each "
    "clipped to [0,1] from out-of-fold time-series validation. "
    "It is a transparent score, not a probability of profit."
)
UNCERTAINTY_METHOD = (
    "95% prediction interval: point forecast +/- 1.96 * sigma, where sigma "
    "is the standard deviation of purged time-series out-of-fold residuals "
    "(widened with sqrt(time) for intermediate days)."
)
VALIDATION_METHOD = (
    "TimeSeriesSplit(%d), expanding window, no shuffling, purged gap of "
    "`horizon` rows between train and test to avoid overlapping "
    "forward-return windows." % FOLDS
)


def make_features(df):
    """Feature matrix using ONLY past information at each timestamp."""
    close = df["Close"].astype(float)
    high = df["High"].astype(float)
    low = df["Low"].astype(float)
    volume = df["Volume"].fillna(0).astype(float)
    ret1 = close.pct_change()

    f = pd.DataFrame(index=df.index)
    f["ret_1"] = ret1
    f["ret_5"] = close.pct_change(5)
    f["ret_10"] = close.pct_change(10)
    f["mom_20"] = close.pct_change(20)
    f["roll_mean_5"] = ret1.rolling(5).mean()
    f["roll_std_5"] = ret1.rolling(5).std()
    f["roll_std_20"] = ret1.rolling(20).std()

    rsi = RSIIndicator(close, 14).rsi()
    f["rsi_14"] = rsi
    f["rsi_delta_5"] = rsi.diff(5)

    macd_hist = MACD(close).macd_diff()
    f["macd_hist"] = macd_hist
    f["macd_hist_delta"] = macd_hist.diff(3)

    f["dist_sma20"] = close / SMAIndicator(close, 20).sma_indicator() - 1.0
    f["dist_sma50"] = close / SMAIndicator(close, 50).sma_indicator() - 1.0
    f["dist_ema20"] = close / EMAIndicator(close, 20).ema_indicator() - 1.0

    vol_ma = volume.rolling(20).mean()
    vol_sd = volume.rolling(20).std().replace(0.0, np.nan)
    f["vol_z"] = (volume - vol_ma) / vol_sd

    roll_max = high.rolling(20).max()
    roll_min = low.rolling(20).min()
    rng = (roll_max - roll_min).replace(0.0, np.nan)
    f["range_pos"] = (close - roll_min) / rng

    atr = AverageTrueRange(high, low, close, 14).average_true_range()
    f["atr_pct"] = atr / close * 100.0
    f["day_of_week"] = df.index.dayofweek
    return f


def _model_factory():
    """Candidate models. All are lightweight enough for Render free tier."""
    return {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(
            n_estimators=150,
            max_depth=6,
            min_samples_leaf=15,
            random_state=42,
            n_jobs=-1,
        ),
        "Gradient Boosting": GradientBoostingRegressor(
            n_estimators=120,
            max_depth=3,
            learning_rate=0.05,
            random_state=42,
        ),
    }


def _score_predictions(pred_ret, true_ret, origin_price):
    """Metrics on out-of-fold predictions.

    MAE/RMSE are converted to price units via each sample's origin price.
    MAPE is the mean absolute error of the horizon return in percent.
    Directional accuracy compares sign(predicted) vs sign(actual).
    """
    pred = np.asarray(pred_ret, dtype=float)
    true = np.asarray(true_ret, dtype=float)
    err_ret = pred - true
    err_price = err_ret * np.asarray(origin_price, dtype=float)
    return {
        "mae": round(float(np.mean(np.abs(err_price))), 4),
        "rmse": round(float(np.sqrt(np.mean(err_price ** 2))), 4),
        "mape_pct": round(float(np.mean(np.abs(err_ret)) * 100.0), 3),
        "directional_accuracy_pct": round(
            float(np.mean(np.sign(pred) == np.sign(true)) * 100.0), 1
        ),
        "residual_sigma_pct": round(
            float(np.std(err_ret, ddof=1)) * 100.0
            if len(err_ret) > 2
            else 0.0,
            3,
        ),
        "n_eval": int(len(err_ret)),
    }


def _cross_validate(model, X, y, splits, horizon):
    """Expanding-window CV returning out-of-fold predictions for every row.

    A purged gap of `horizon` rows is removed from the end of each training
    fold so overlapping forward-return windows cannot leak into the test
    fold (purged time-series cross-validation).
    """
    oof = pd.Series(np.nan, index=y.index, dtype=float)
    for train_idx, test_idx in splits:
        tr = (
            train_idx[:-horizon]
            if len(train_idx) - horizon >= 60
            else train_idx
        )
        model.fit(X.iloc[tr], y.iloc[tr])
        oof.iloc[test_idx] = model.predict(X.iloc[test_idx])
    return oof


def train_and_forecast(df, horizon=14):
    """Train candidates with time-aware validation and forecast `horizon`
    trading days ahead. Raises ApiError when data is insufficient."""
    horizon = int(horizon)
    if horizon < 1 or horizon > 60:
        raise ApiError("Forecast horizon must be between 1 and 60 days.", 400)
    if len(df) < MIN_TRAIN_ROWS + horizon:
        raise ApiError(
            "Not enough historical data for model evaluation (need at least "
            "%d sessions, got %d)." % (MIN_TRAIN_ROWS + horizon, len(df)),
            400,
        )

    close = df["Close"].astype(float)
    X_all = make_features(df)
    fwd = close.shift(-horizon) / close - 1.0  # target: forward return

    mask = X_all.notna().all(axis=1) & fwd.notna()
    X = X_all[mask]
    y = fwd[mask]
    origin_price = close[mask]
    if len(X) < MIN_TRAIN_ROWS:
        raise ApiError(
            "Not enough usable samples after feature warm-up (%d < %d)."
            % (len(X), MIN_TRAIN_ROWS),
            400,
        )

    splits = list(TimeSeriesSplit(n_splits=FOLDS).split(X))

    # persistence baseline: always predict 0% change
    naive = _score_predictions(np.zeros(len(y)), y.values, origin_price.values)

    results, oofs = {}, {}
    for name, model in _model_factory().items():
        oof = _cross_validate(model, X, y, splits, horizon)
        ok = oof.notna()
        results[name] = _score_predictions(
            oof[ok].values, y[ok].values, origin_price[ok].values
        )
        oofs[name] = oof

    best_name = min(results, key=lambda n: results[n]["mae"])
    best_metrics = results[best_name]

    model = _model_factory()[best_name]
    model.fit(X, y)  # final fit on all data for the live forecast
    latest = X_all.iloc[[-1]]
    if bool(latest.isna().values.any()):
        raise ApiError(
            "Latest feature vector has missing values; cannot forecast.", 500
        )
    pred_ret = float(np.clip(float(model.predict(latest)[0]), -0.5, 0.5))

    price_now = float(close.iloc[-1])
    target = price_now * (1.0 + pred_ret)

    sigma = best_metrics["residual_sigma_pct"] / 100.0
    preds, uppers, lowers = [], [], []
    for h in range(1, horizon + 1):
        point = price_now + (target - price_now) * (h / horizon)
        sig_h = sigma * (h / horizon) ** 0.5
        preds.append(json_safe(point, 2))
        uppers.append(json_safe(point * (1 + 1.96 * sig_h), 2))
        lowers.append(json_safe(point * (1 - 1.96 * sig_h), 2))

    interval_pct = 1.96 * sigma * 2 * 100.0
    da = best_metrics["directional_accuracy_pct"]
    da_c = float(np.clip((da - 50.0) / 30.0, 0, 1))
    mape_c = float(np.clip(1.0 - best_metrics["mape_pct"] / 10.0, 0, 1))
    int_c = float(np.clip(1.0 - interval_pct / 40.0, 0, 1))
    confidence = round(100.0 * (0.40 * da_c + 0.35 * mape_c + 0.25 * int_c), 1)

    # Honest skill check: naive MAE / model MAE. >1 means the model beats
    # "predict no change" on magnitude; <1 means it does not.
    skill = (
        round(naive["mae"] / best_metrics["mae"], 3)
        if best_metrics["mae"] > 0
        else None
    )
    if skill is None:
        strength = "unknown"
    elif skill < 0.9:
        strength = "weak"
    elif skill < 1.1:
        strength = "moderate"
    else:
        strength = "strong"
    skill_note = (
        "Selected model does NOT beat the naive no-change baseline on MAE "
        "for this symbol/horizon — treat the point forecast with extra "
        "caution."
        if (skill is not None and skill < 1.0)
        else "Selected model beats the naive no-change baseline on MAE."
    )

    change_pct = pred_ret * 100.0
    direction = (
        "UP" if change_pct > 0.5 else ("DOWN" if change_pct < -0.5 else "FLAT")
    )
    return {
        "horizon_days": horizon,
        "current_price": json_safe(price_now, 2),
        "forecast_price": json_safe(target, 2),
        "expected_change": json_safe(target - price_now, 2),
        "expected_change_pct": json_safe(change_pct, 2),
        "direction": direction,
        "predictions": preds,
        "lower": lowers,
        "upper": uppers,
        "path_note": (
            "The chart path is linearly interpolated between today's price "
            "and the horizon target; only the horizon value is a direct "
            "model output."
        ),
        "model": best_name,
        "models_compared": results,
        "naive_baseline": naive,
        "metrics": best_metrics,
        "skill_vs_naive_mae": skill,
        "forecast_strength": strength,
        "skill_note": skill_note,
        "model_confidence": confidence,
        "confidence_method": CONFIDENCE_METHOD,
        "uncertainty": {
            "method": UNCERTAINTY_METHOD,
            "sigma_pct": best_metrics["residual_sigma_pct"],
            "horizon_lower": lowers[-1],
            "horizon_upper": uppers[-1],
            "interval_width_pct": json_safe(interval_pct, 2),
        },
        "validation": VALIDATION_METHOD,
        "features": list(X.columns),
        "train_samples": int(len(X)),
        "history_sessions": int(len(df)),
        "disclaimer": (
            "AI-generated market analysis for informational purposes only. "
            "Not financial advice."
        ),
    }


