from flask import Flask, request, jsonify
import yfinance as yf
import numpy as np
from sklearn.linear_model import LinearRegression
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return "Market AI Tracker Backend Running"


@app.route('/predict', methods=['GET'])
def predict():
    ticker = request.args.get('ticker')

    if not ticker:
        return jsonify({"error": "Ticker is required"}), 400

    try:
        # Download stock data
        data = yf.download(ticker, period="3mo", progress=False)

        if data is None or data.empty:
            return jsonify({"error": "Invalid ticker or no data"}), 400

        # Get Close prices only
        close_prices = data['Close'].dropna()

        # Convert safely to 1D array
        close_prices = np.array(close_prices).flatten()

        if len(close_prices) < 10:
            return jsonify({"error": "Not enough data"}), 400

        # Create day numbers
        X = np.arange(len(close_prices)).reshape(-1, 1)
        y = close_prices

        # Train AI model
        model = LinearRegression()
        model.fit(X, y)

        # Predict next 14 days
        future_days = np.arange(len(close_prices), len(close_prices) + 14).reshape(-1, 1)
        predictions = model.predict(future_days)

        # Last values
        last_actual = float(y[-1])
        last_pred = float(predictions[-1])

        # Trend
        trend = "UP" if last_pred > last_actual else "DOWN"

        # AI explanation
        recent_avg = float(np.mean(y[-5:]))
        overall_avg = float(np.mean(y))

        if recent_avg < overall_avg:
            reason = "Recent prices are falling below average (Bearish signal)"
        else:
            reason = "Prices are stable or increasing (Bullish signal)"

        # Alert
        if trend == "DOWN":
            alert = "⚠️ High Risk - Price may fall"
        else:
            alert = "✅ Positive Trend - Safer zone"

        return jsonify({
            "ticker": ticker,
            "trend": trend,
            "reason": reason,
            "alert": alert,
            "predictions": [float(i) for i in predictions]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port, debug=False)