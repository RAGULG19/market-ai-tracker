import { useState } from "react";
import axios from "axios";
import Chart from "react-apexcharts";

function App() {
  const [ticker, setTicker] = useState("");
  const [data, setData] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Backend URL
  const API_URL = "https://market-ai-tracker.onrender.com";

  // ✅ Get Prediction
  const getPrediction = async (selectedTicker = ticker) => {
    try {
      setLoading(true);

      let finalTicker = selectedTicker.toUpperCase().trim();

      // ✅ Indian Stock Mapping
      const stockMap = {
        TCS: "TCS.NS",
        INFY: "INFY.NS",
        RELIANCE: "RELIANCE.NS",
        SBIN: "SBIN.NS",
        HDFCBANK: "HDFCBANK.NS",
        ITC: "ITC.NS",
        TATASTEEL: "TATASTEEL.NS",
        "TATA STEEL": "TATASTEEL.NS",
        WIPRO: "WIPRO.NS",
        ADANI: "ADANIENT.NS",
        ADANIPORTS: "ADANIPORTS.NS",
        "ADITYA BIRLA": "ABCAPITAL.NS",
        MARUTI: "MARUTI.NS",
        ASIANPAINTS: "ASIANPAINT.NS",
        AXISBANK: "AXISBANK.NS"
      };

      // ✅ Convert Indian names
      if (stockMap[finalTicker]) {
        finalTicker = stockMap[finalTicker];
      }

      // ✅ API Call
      const res = await axios.get(
        `${API_URL}/predict?ticker=${finalTicker}`
      );

      console.log("API RESPONSE:", res.data);

      setData(res.data);

    } catch (err) {
      console.error(err);

      if (err.response) {
        alert(err.response.data.error || "Backend Error");
      } else {
        alert("Server connection failed");
      }

    } finally {
      setLoading(false);
    }
  };

  // ✅ Add Watchlist
  const addToWatchlist = () => {
    const stock = ticker.toUpperCase().trim();

    if (stock && !watchlist.includes(stock)) {
      setWatchlist([...watchlist, stock]);
    }
  };

  // ✅ Chart Data
  const candlestickData = {
    series: [
      {
        data:
          data?.ohlc?.open?.map((_, index) => ({
            x: `Day ${index + 1}`,
            y: [
              data.ohlc.open[index],
              data.ohlc.high[index],
              data.ohlc.low[index],
              data.ohlc.close[index]
            ]
          })) || []
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

      {/* ✅ Input */}
      <input
        type="text"
        value={ticker}
        placeholder="Enter Stock (TCS, Tata Steel, AAPL...)"
        onChange={(e) => setTicker(e.target.value)}
        style={{
          padding: "12px",
          marginRight: "10px",
          borderRadius: "8px",
          border: "none",
          width: "320px"
        }}
      />

      {/* ✅ Predict Button */}
      <button
        onClick={() => getPrediction()}
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

      {/* ✅ Watchlist Button */}
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

      {/* ✅ Loading */}
      {loading && (
        <p style={{ marginTop: "20px" }}>
          ⏳ Loading prediction...
        </p>
      )}

      {/* ✅ Prediction Result */}
      {data && (
        <div style={{ marginTop: "30px" }}>

          <h2>
            📈 Trend:{" "}
            {data?.trend === "UP"
              ? "🟢 UP"
              : "🔴 DOWN"}
          </h2>

          <h2>
            💰 Current Price: $
            {data?.current_price
              ? Number(data.current_price).toFixed(2)
              : "0.00"}
          </h2>

          <h2>
            🎯 Signal:{" "}
            {data?.signal === "BUY"
              ? "🟢 BUY"
              : "🔴 SELL"}
          </h2>

          <h3>
            🔥 Confidence: {data?.confidence || 0}%
          </h3>

          <h3>
            📊 RSI: {data?.rsi || "N/A"}
          </h3>

          <h3>
            🚦 RSI Status: {data?.rsi_signal || "N/A"}
          </h3>

          <p>
            🧠 Reason: {data?.reason || "No analysis available"}
          </p>

          <p
            style={{
              color:
                data?.signal === "BUY"
                  ? "#4ade80"
                  : "#ff4d4f",
              fontWeight: "bold"
            }}
          >
            ⚠️ Alert: {data?.alert || "No alerts"}
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
                getPrediction(item);
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