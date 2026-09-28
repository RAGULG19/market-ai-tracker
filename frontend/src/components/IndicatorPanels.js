import Chart from "react-apexcharts";
import { memo } from "react";
import { formatNumber } from "../services/format";

const toX = (d) => new Date(String(d).replace(" ", "T")).getTime();

const baseOptions = (height) => ({
  chart: {
    type: "line",
    height,
    background: "transparent",
    fontFamily: "inherit",
    toolbar: { show: false },
    animations: { enabled: false },
    sparkline: { enabled: false },
  },
  theme: { mode: "dark" },
  dataLabels: { enabled: false },
  grid: { borderColor: "rgba(148,163,184,0.10)", strokeDashArray: 3 },
  xaxis: {
    type: "datetime",
    labels: {
      datetimeUTC: false,
      style: { colors: "#64748b", fontSize: "10px" },
      datetimeFormatter: { day: "dd MMM", month: "MMM yy" },
    },
  },
  tooltip: { theme: "dark", shared: true },
});

/**
 * Secondary indicator panels: RSI (30/70 zones), MACD (line+signal+hist),
 * Volume (bars + 20-day average). Kept as separate panels so the price
 * chart stays readable.
 */
function IndicatorPanels({ indicators, show }) {
  if (!indicators || !indicators.dates || !indicators.dates.length) return null;
  const { dates, series } = indicators;
  const xs = dates.map(toX);
  const panels = [];

  if (show.rsi && series.rsi) {
    panels.push(
      <div className="card chart-card" key="rsi">
        <h3 className="card-title">RSI (14)</h3>
        <Chart
          type="line"
          height={180}
          options={{
            ...baseOptions(180),
            colors: ["#a78bfa"],
            annotations: {
              yaxis: [
                {
                  y: 70,
                  borderColor: "rgba(248,113,113,0.6)",
                  strokeDashArray: 4,
                  label: {
                    text: "70 overbought",
                    style: { color: "#f87171", fontSize: "10px", background: "transparent" },
                  },
                },
                {
                  y: 30,
                  borderColor: "rgba(52,211,153,0.6)",
                  strokeDashArray: 4,
                  label: {
                    text: "30 oversold",
                    style: { color: "#34d399", fontSize: "10px", background: "transparent" },
                  },
                },
              ],
            },
            yaxis: {
              min: 0,
              max: 100,
              tickAmount: 4,
              labels: { style: { colors: "#64748b", fontSize: "10px" } },
            },
          }}
          series={[
            { name: "RSI", data: xs.map((x, i) => ({ x, y: series.rsi[i] })) },
          ]}
        />
      </div>
    );
  }

  if (show.macd && series.macd) {
    panels.push(
      <div className="card chart-card" key="macd">
        <h3 className="card-title">MACD (12, 26, 9)</h3>
        <Chart
          type="line"
          height={180}
          options={{
            ...baseOptions(180),
            colors: ["#22d3ee", "#f472b6", "#34d399"],
            stroke: { width: [2, 2, 0] },
            plotOptions: { bar: { columnWidth: "60%" } },
            yaxis: {
              labels: {
                style: { colors: "#64748b", fontSize: "10px" },
                formatter: (v) => formatNumber(v, 2),
              },
            },
            legend: { labels: { colors: "#cbd5e1" }, fontSize: "11px" },
          }}
          series={[
            { name: "MACD", data: xs.map((x, i) => ({ x, y: series.macd[i] })) },
            {
              name: "Signal",
              data: xs.map((x, i) => ({ x, y: series.macd_signal[i] })),
            },
            {
              name: "Histogram",
              type: "column",
              data: xs.map((x, i) => ({ x, y: series.macd_hist[i] })),
            },
          ]}
        />
      </div>
    );
  }

  if (show.volume && series.volume) {
    panels.push(
      <div className="card chart-card" key="volume">
        <h3 className="card-title">Volume</h3>
        <Chart
          type="line"
          height={160}
          options={{
            ...baseOptions(160),
            colors: ["#38bdf8", "#facc15"],
            plotOptions: { bar: { columnWidth: "70%" } },
            stroke: { width: [0, 2] },
            yaxis: {
              labels: {
                style: { colors: "#64748b", fontSize: "10px" },
                formatter: (v) =>
                  v >= 1e6
                    ? `${(v / 1e6).toFixed(1)}M`
                    : v >= 1e3
                    ? `${(v / 1e3).toFixed(0)}K`
                    : String(Math.round(v)),
              },
            },
            legend: { labels: { colors: "#cbd5e1" }, fontSize: "11px" },
          }}
          series={[
            {
              name: "Volume",
              type: "column",
              data: xs.map((x, i) => ({ x, y: series.volume[i] })),
            },
            {
              name: "Vol SMA 20",
              data: xs.map((x, i) => ({ x, y: series.volume_avg20[i] })),
            },
          ]}
        />
      </div>
    );
  }

  if (!panels.length) return null;
  return (
    <section className="indicator-panels" aria-label="Indicator panels">
      {panels}
    </section>
  );
}

export default memo(IndicatorPanels);
