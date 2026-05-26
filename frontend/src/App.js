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

</div>