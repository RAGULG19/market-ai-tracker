from flask import Flask, request, jsonify
import yfinance as yf
import numpy as np
from sklearn.linear_model import LinearRegression
from flask_cors import CORS

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
        data = yf.download(ticker, period="3mo", progress=False)

        if data is None or data.empty:
            return jsonify({"error": "Invalid ticker or no data"}), 400

        data = data[['Close']]
        data.dropna(inplace=True)

        if len(data) < 10:
            return jsonify({"error": "Not enough data"}), 400

        data['Day'] = np.arange(len(data))

        X = data[['Day']]
        y = data['Close']

        model = LinearRegression()
        model.fit(X, y)

        future_days = np.arange(len(data), len(data)+14).reshape(-1,1)
        predictions = model.predict(future_days)

        last_actual = float(y.iloc[-1])
        last_pred = float(predictions[-1])

        trend = "UP" if last_pred > last_actual else "DOWN"

        # 🧠 Explainable AI
        recent_avg = float(y.tail(5).mean())
        overall_avg = float(y.mean())

        if recent_avg < overall_avg:
            reason = "Recent prices are falling below average (Bearish signal)"
        else:
            reason = "Prices are stable or increasing (Bullish signal)"

        # 🔔 ALERT SYSTEM
        if trend == "DOWN":
            alert = "⚠️ High Risk - Price may fall"
        else:
            alert = "✅ Positive Trend - Safer zone"

        return jsonify({
            "ticker": ticker,
            "trend": trend,
            "reason": reason,
            "alert": alert,   # ✅ NEW
            "predictions": [float(i) for i in predictions]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port, debug=False)