import { useState } from "react";
import axios from "axios";
import Chart from "react-apexcharts";

function App() {
  const [ticker, setTicker] = useState("");
  const [data, setData] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(false);

  const getPrediction = async () => {
    try {
      setLoading(true);

      let finalTicker = ticker.toUpperCase();

      // ✅ Indian stock auto support
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

  // ✅ Candlestick Chart Data
  const candlestickData = {
    series: [
      {
        data: data
          ? data.ohlc.open.map((_, index) => ({
            x: `Day ${index + 1}`,
            y: [
              data.ohlc.open[index],
              data.ohlc.high[index],
              data.ohlc.low[index],
              data.ohlc.close[index]
            ]
          }))
          : []
      }
    ],
    options: {
      chart: {
        type: "candlestick",
        height: 350,
        background: "#1e293b",
        toolbar: {
          show: true
        }
      },
      theme: {
        mode: "dark"
      },
      xaxis: {
        type: "category"
      },
      yaxis: {
        tooltip: {
          enabled: true
        }
      }
    }
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
      <h1 style={{ fontSize: "40px" }}>
        📊 Market AI Tracker
      </h1>

      <input
        type="text"
        value={ticker}
        placeholder="Enter Stock (RELIANCE, AAPL, TSLA...)"
        onChange={(e) => setTicker(e.target.value)}
        style={{
          padding: "12px",
          marginRight: "10px",
          borderRadius: "8px",
          border: "none",
          width: "300px"
        }}
      />

      <button
        onClick={getPrediction}
        style={{
          padding: "12px",
          marginRight: "10px",
          borderRadius: "8px",
          cursor: "pointer",
          background: "#22c55e",
          color: "white",
          border: "none"
        }}
      >
        Predict
      </button>

      <button
        onClick={addToWatchlist}
        style={{
          padding: "12px",
          borderRadius: "8px",
          cursor: "pointer",
          background: "#facc15",
          border: "none"
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

          <p
            style={{
              color:
                data.signal === "BUY"
                  ? "#4ade80"
                  : "#ff4d4f",
              fontWeight: "bold"
            }}
          >
            ⚠️ Alert:
            {" "}
            {data.alert}
          </p>

          {/* ✅ Candlestick Chart */}
          <div
            style={{
              marginTop: "30px",
              background: "#0f172a",
              padding: "20px",
              borderRadius: "12px"
            }}
          >
            <Chart
              options={candlestickData.options}
              series={candlestickData.series}
              type="candlestick"
              height={400}
            />
          </div>
        </div>
      )}

      {/* ✅ Watchlist */}
      <div style={{ marginTop: "40px" }}>
        <h3>⭐ Watchlist</h3>

        <ul>
          {watchlist.map((item, index) => (
            <li
              key={index}
              style={{
                cursor: "pointer",
                marginTop: "10px",
                fontSize: "18px"
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