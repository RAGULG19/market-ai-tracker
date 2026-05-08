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

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

function App() {
  const [ticker, setTicker] = useState("");
  const [data, setData] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(false); // 🔥 added

  const getPrediction = async () => {
    try {
      setLoading(true); // 🔥 loading start
      const res = await axios.get(
        `https://your-render-url.onrender.com/predict?ticker=${ticker}`
      );
      setData(res.data);
    } catch (err) {
      alert("Error fetching data");
    } finally {
      setLoading(false); // 🔥 loading stop
    }
  };

  const addToWatchlist = () => {
    if (ticker && !watchlist.includes(ticker)) {
      setWatchlist([...watchlist, ticker]);
    }
  };

  const chartData = {
    labels: data ? data.predictions.map((_, i) => `Day ${i + 1}`) : [],
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
    <div style={{
      background: "linear-gradient(135deg, #0f172a, #1e293b)",
      color: "white",
      minHeight: "100vh",
      padding: "40px",
      fontFamily: "sans-serif"
    }}>
      <h1>📊 Market AI Tracker</h1>

      <input
        type="text"
        value={ticker}  // 🔥 fixed
        placeholder="Enter Stock (RELIANCE.NS, AAPL...)"
        onChange={(e) => setTicker(e.target.value)}
        style={{ padding: "10px", marginRight: "10px" }}
      />

      <button onClick={getPrediction} style={{ padding: "10px", marginRight: "10px" }}>
        Predict
      </button>

      <button onClick={addToWatchlist} style={{ padding: "10px" }}>
        ⭐ Add to Watchlist
      </button>

      {loading && <p>⏳ Loading prediction...</p>} {/* 🔥 added */}

      {data && (
        <div style={{ marginTop: "20px" }}>
          <h2>
            Trend: {data.trend === "UP" ? "🟢 UP" : "🔴 DOWN"}
          </h2>

          <p>🧠 Reason: {data.reason}</p>

          <p style={{
            marginTop: "10px",
            fontWeight: "bold",
            color: data.trend === "DOWN" ? "#ff4d4f" : "#4ade80"
          }}>
            {data.alert}
          </p>

          <div style={{ width: "600px", marginTop: "20px" }}>
            <Line data={chartData} />
          </div>
        </div>
      )}

      <div style={{ marginTop: "30px" }}>
        <h3>⭐ Watchlist</h3>
        <ul>
          {watchlist.map((item, index) => (
            <li
              key={index}
              style={{ cursor: "pointer" }}
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