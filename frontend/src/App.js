import { useState } from "react";
import axios from "axios";
import Chart from "react-apexcharts";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [ticker, setTicker] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const API_URL = "https://market-ai-tracker.onrender.com";

  const getPrediction = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/predict?ticker=${ticker}`);
      setData(res.data);
    } catch (err) {
      alert("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const candlestickData = {
    series: [
      {
        data:
          data?.ohlc?.open?.map((_, index) => ({
            x: `Day ${index + 1}`,
            y: [
              Number(data.ohlc.open[index]),
              Number(data.ohlc.high[index]),
              Number(data.ohlc.low[index]),
              Number(data.ohlc.close[index]),
            ],
          })) || [],
      },
    ],
    options: {
      chart: {
        type: "candlestick",
        height: 350,
        background: "#0f172a",
        toolbar: { show: true },
      },
      theme: { mode: "dark" },
      xaxis: { type: "category" },
      yaxis: { tooltip: { enabled: true } },
      grid: { borderColor: "#334155" },
    },
  };

  const predictionChart = {
    labels: data?.predictions?.map((_, i) => `Day ${i + 1}`) || [],
    datasets: [
      {
        label: "AI Prediction",
        data: data?.predictions || [],
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.3)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  return (
    <div className="app-container">
      <h1 className="title">📊 Market AI Tracker</h1>

      <div className="input-section">
        <input
          type="text"
          value={ticker}
          placeholder="Enter Stock (TCS, INFY, AAPL...)"
          onChange={(e) => setTicker(e.target.value)}
        />
        <button className="predict-btn" onClick={getPrediction}>
          Predict
        </button>
      </div>

      {loading && <p className="loading">⏳ Fetching data...</p>}

      {data && (
        <div className="result-section">
          <div className="info-cards">
            <div className="card trend">
              <h3>Trend: {data.trend === "UP" ? "🟢 UP" : "🔴 DOWN"}</h3>
            </div>
            <div className="card price">
              <h3>💰 Price: ${data.current_price}</h3>
            </div>
            <div className="card signal">
              <h3>🎯 Signal: {data.signal}</h3>
            </div>
            <div className="card rsi">
              <h3>📊 RSI: {data.rsi}</h3>
              <p>{data.rsi_signal}</p>
            </div>
            <div className="card sma">
              <h3>📉 SMA20: {data.sma20}</h3>
              <h3>📉 SMA50: {data.sma50}</h3>
            </div>
          </div>

          <p className="reason">🧠 {data.reason}</p>
          <p className="alert">{data.alert}</p>

          <div className="chart-section">
            <Chart
              options={candlestickData.options}
              series={candlestickData.series}
              type="candlestick"
              height={400}
            />
            <Line
              data={predictionChart}
              options={{
                responsive: true,
                plugins: {
                  legend: { labels: { color: "white" } },
                },
                scales: {
                  x: { ticks: { color: "white" } },
                  y: { ticks: { color: "white" } },
                },
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
