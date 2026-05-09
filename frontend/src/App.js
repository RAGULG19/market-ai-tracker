import { useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement
);

function App() {
  const [ticker, setTicker] = useState("");
  const [data, setData] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(false);

  const getPrediction = async () => {
    try {
      setLoading(true);

      let finalTicker = ticker.toUpperCase();

      // Indian stock auto support
      if (
        !finalTicker.includes(".") &&
        ["TCS", "INFY", "RELIANCE", "SBIN", "HDFCBANK", "ITC"].includes(finalTicker)
      ) {
        finalTicker = finalTicker + ".NS";
      }

      const res = await axios.get(
        `https://market-ai-tracker.onrender.com/predict?ticker=${finalTicker}`
      );

      setData(res.data);

    } catch (err) {
      alert("Error fetching data");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = () => {
    if (ticker && !watchlist.includes(ticker)) {
      setWatchlist([...watchlist, ticker]);
    }
  };

  const chartData = {
    labels: data
      ? data.predictions.map((_, i) => `Day ${i + 1}`)
      : [],

    datasets: [
      {
        label: "Prediction",
        data: data ? data.predictions : [],
        borderWidth: 3,
        tension: 0.4
      }
    ]
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        color: "white",
        minHeight: "100vh",
        padding: "40px",
        fontFamily: "sans-serif"
      }}
    >
      <h1>📊 Market AI Tracker</h1>

      <input
        type="text"
        value={ticker}
        placeholder="Enter Stock (RELIANCE.NS, AAPL...)"
        onChange={(e) => setTicker(e.target.value)}
        style={{
          padding: "10px",
          marginRight: "10px",
          borderRadius: "8px",
          border: "none"
        }}
      />

      <button
        onClick={getPrediction}
        style={{
          padding: "10px",
          marginRight: "10px",
          borderRadius: "8px",
          cursor: "pointer"
        }}
      >
        Predict
      </button>

      <button
        onClick={addToWatchlist}
        style={{
          padding: "10px",
          borderRadius: "8px",
          cursor: "pointer"
        }}
      >
        ⭐ Add to Watchlist
      </button>

      {loading && (
        <p style={{ marginTop: "20px" }}>
          ⏳ Loading prediction...
        </p>
      )}

      {data && (
        <div style={{ marginTop: "30px" }}>

          <h2>
            📈 Trend:
            {" "}
            {data.trend === "UP"
              ? "🟢 UP"
              : "🔴 DOWN"}
          </h2>

          <h2>
            💰 Current Price:
            {" "}
            ${data.current_price?.toFixed(2)}
          </h2>

          <h2>
            🎯 Signal:
            {" "}
            {data.signal === "BUY"
              ? "🟢 BUY"
              : "🔴 SELL"}
          </h2>

          <h3>
            🔥 Confidence:
            {" "}
            {data.confidence}%
          </h3>

          <h3>
            📊 RSI:
            {" "}
            {data.rsi}
          </h3>

          <h3>
            🚦 RSI Status:
            {" "}
            {data.rsi_signal}
          </h3>

          <p>
            🧠 Reason:
            {" "}
            {data.reason}
          </p>

          <p>
            ⚠️ Alert:
            {" "}
            {data.alert}
          </p>

          <div
            style={{
              width: "700px",
              marginTop: "20px",
              background: "white",
              padding: "20px",
              borderRadius: "12px"
            }}
          >
            <Line data={chartData} />
          </div>
        </div>
      )}

      <div style={{ marginTop: "40px" }}>
        <h3>⭐ Watchlist</h3>

        <ul>
          {watchlist.map((item, index) => (
            <li
              key={index}
              style={{
                cursor: "pointer",
                marginTop: "10px"
              }}
              onClick={() => {
                setTicker(item);

                setTimeout(() => {
                  getPrediction();
                }, 300);
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;