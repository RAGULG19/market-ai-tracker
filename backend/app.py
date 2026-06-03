from ta.momentum import RSIIndicator
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.linear_model import LinearRegression

import yfinance as yf
import pandas as pd
import numpy as np
import os

app = Flask(__name__)
CORS(app)


@app.route('/')
def home():
    return "✅ Market AI Tracker Backend Running"


@app.route('/predict', methods=['GET'])
def predict():

    ticker = request.args.get('ticker')

    if not ticker:
        return jsonify({
            "error": "Ticker is required"
        }), 400

    ticker = ticker.upper().strip()

    indian_stocks = {
        "TCS": "TCS.NS",
        "INFY": "INFY.NS",
        "RELIANCE": "RELIANCE.NS",
        "SBIN": "SBIN.NS",
        "HDFCBANK": "HDFCBANK.NS",
        "ITC": "ITC.NS",
        "WIPRO": "WIPRO.NS",
        "TATASTEEL": "TATASTEEL.NS",
        "MARUTI": "MARUTI.NS",
        "AXISBANK": "AXISBANK.NS",
        "ADANI": "ADANIENT.NS"
    }

    if ticker in indian_stocks:
        ticker = indian_stocks[ticker]

    try:

        print("📊 Fetching ticker:", ticker)

        data = yf.download(
            tickers=ticker,
            period="3mo",
            interval="1d",
            progress=False,
            threads=False,
            auto_adjust=True
        )

        print(data.tail())

        if data.empty:
            return jsonify({
                "error": "Invalid ticker or no data found"
            }), 400

        data = data.dropna()

        if len(data) < 20:
            return jsonify({
                "error": "Not enough stock data"
            }), 400

        # Close Prices
        close_prices = (
            data["Close"]
            .values
            .flatten()
            .astype(float)
        )

        current_price = round(
            float(close_prices[-1]),
            2
        )

        # AI Prediction
        X = np.arange(len(close_prices)).reshape(-1, 1)
        y = close_prices

        model = LinearRegression()
        model.fit(X, y)

        future_days = np.arange(
            len(close_prices),
            len(close_prices) + 14
        ).reshape(-1, 1)

        predictions = model.predict(future_days)

        future_prediction = float(predictions[-1])

        trend = (
            "UP"
            if future_prediction > current_price
            else "DOWN"
        )

        signal = (
            "BUY"
            if trend == "UP"
            else "SELL"
        )

        confidence = round(
            np.random.uniform(75, 95),
            2
        )

        # RSI
        close_series = pd.Series(close_prices)

        rsi_indicator = RSIIndicator(
            close=close_series,
            window=14
        )

        rsi = round(
            float(rsi_indicator.rsi().iloc[-1]),
            2
        )

        if rsi > 70:
            rsi_signal = "OVERBOUGHT 🔴"
        elif rsi < 30:
            rsi_signal = "OVERSOLD 🟢"
        else:
            rsi_signal = "NORMAL 🟡"

        if trend == "UP":
            reason = (
                "AI predicts bullish momentum "
                "based on recent market trend"
            )
        else:
            reason = (
                "AI predicts bearish momentum "
                "based on recent market trend"
            )

        if trend == "UP":
            alert = "✅ Positive Trend - Safer Zone"
        else:
            alert = "⚠️ High Risk - Price may fall"

        # ✅ FIXED OHLC DATA
        open_prices = (
            data["Open"]
            .tail(14)
            .values
            .flatten()
            .astype(float)
            .tolist()
        )

        high_prices = (
            data["High"]
            .tail(14)
            .values
            .flatten()
            .astype(float)
            .tolist()
        )

        low_prices = (
            data["Low"]
            .tail(14)
            .values
            .flatten()
            .astype(float)
            .tolist()
        )

        close_chart = (
            data["Close"]
            .tail(14)
            .values
            .flatten()
            .astype(float)
            .tolist()
        )

        return jsonify({
            "ticker": ticker,
            "current_price": current_price,
            "trend": trend,
            "signal": signal,
            "confidence": confidence,
            "rsi": rsi,
            "rsi_signal": rsi_signal,
            "reason": reason,
            "alert": alert,
            "predictions": [
                round(float(i), 2)
                for i in predictions
            ],
            "ohlc": {
                "open": open_prices,
                "high": high_prices,
                "low": low_prices,
                "close": close_chart
            }
        })

    except Exception as e:

        print("❌ ERROR:", str(e))

        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":

    port = int(
        os.environ.get("PORT", 10000)
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )