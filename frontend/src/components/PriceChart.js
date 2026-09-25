import Chart from "react-apexcharts";
import { formatPrice } from "../services/format";

/** Range buttons mapped to backend ?range= values. */
export const RANGES = ["1D", "5D", "1M", "3M", "6M", "1Y", "5Y"];
export const RANGE_PARAM = {
  "1D": "1d",
  "5D": "5d",
  "1M": "1mo",
  "3M": "3mo",
  "6M": "6mo",
  "1Y": "1y",
  "5Y": "5y",
};

export const OVERLAYS = [
  { id: "sma20", label: "SMA 20", color: "#22d3ee" },
  { id: "sma50", label: "SMA 50", color: "#34d399" },
  { id: "ema20", label: "EMA 20", color: "#a78bfa" },
  { id: "ema50", label: "EMA 50", color: "#f472b6" },
  { id: "ema200", label: "EMA 200", color: "#facc15" },
  { id: "bb", label: "Bollinger", color: "#60a5fa" },
];

/** Align an indicator series (its own dates) onto the chart's dates. */
function align(values, valueDates, chartDates) {
  const map = new Map();
  if (valueDates && values) {
    valueDates.forEach((d, i) => map.set(d, values[i]));
  }
  return chartDates.map((d) => (map.has(d) ? map.get(d) : null));
}

const toX = (d) => new Date(String(d).replace(" ", "T")).getTime();

/**
 * Main price chart: candlestick / line / area with SMA+EMA+Bollinger
 * overlays, range selector, zoom & pan (ApexCharts built-in toolbar).
 */
export default function PriceChart({
  history,
  indicators,
  currency = "USD",
  chartType,
  onChartTypeChange,
  range,
  onRangeChange,
  overlays,
  onToggleOverlay,
}) {
  if (!history || !history.dates || !history.dates.length) {
    return (
      <div className="card chart-card">
        <p className="chart-empty">No price history available.</p>
      </div>
    );
  }

  const dates = history.dates;
  const xs = dates.map(toX);
  const indDates = indicators ? indicators.dates : null;
  const series = [];

  if (chartType === "candlestick") {
    series.push({
      name: "Price",
      data: dates.map((d, i) => ({
        x: toX(d),
        y: [history.open[i], history.high[i], history.low[i], history.close[i]],
      })),
    });
  } else {
    series.push({
      name: "Price",
      data: xs.map((x, i) => ({ x, y: history.close[i] })),
    });
  }

  const indSeries = indicators ? indicators.series : null;
  if (indSeries) {
    /* align() is hoisted out of the map callback — building the date
       lookup once per series keeps 5Y ranges (1250+ points) fast. */
    const alignedCache = {};
    const alignedFor = (key) => {
      if (!(key in alignedCache)) {
        alignedCache[key] = align(indSeries[key], indDates, dates);
      }
      return alignedCache[key];
    };
    OVERLAYS.forEach((ov) => {
      if (!overlays[ov.id]) return;
      if (ov.id === "bb") {
        ["bb_upper", "bb_lower"].forEach((key, k) => {
          const vals = alignedFor(key);
          series.push({
            name: k === 0 ? "BB Upper" : "BB Lower",
            type: "line",
            data: xs.map((x, i) => ({ x, y: vals[i] })),
          });
        });
      } else if (indSeries[ov.id]) {
        const vals = alignedFor(ov.id);
        series.push({
          name: ov.label,
          type: "line",
          data: xs.map((x, i) => ({ x, y: vals[i] })),
        });
      }
    });
  }

  const options = {
    chart: {
      type: chartType,
      height: 420,
      background: "transparent",
      fontFamily: "inherit",
      toolbar: { show: true, tools: { download: true, zoom: true, pan: true, reset: true } },
      zoom: { enabled: true, type: "x" },
      animations: { enabled: false },
    },
    theme: { mode: "dark" },
    colors: ["#22d3ee", ...OVERLAYS.map((o) => o.color)],
    stroke: { width: chartType === "candlestick" ? 1 : [2, 1, 1, 1, 1, 1, 1, 1] },
    dataLabels: { enabled: false },
    grid: { borderColor: "rgba(148,163,184,0.12)", strokeDashArray: 3 },
    xaxis: {
      type: "datetime",
      labels: {
        datetimeUTC: false,
        style: { colors: "#94a3b8", fontSize: "11px" },
        datetimeFormatter: { day: "dd MMM", month: "MMM yy" },
      },
    },
    yaxis: {
      labels: {
        style: { colors: "#94a3b8", fontSize: "11px" },
        formatter: (v) => formatPrice(v, currency, v > 1000 ? 0 : 2),
      },
    },
    tooltip: {
      theme: "dark",
      shared: chartType !== "candlestick",
      y: { formatter: (v) => formatPrice(v, currency) },
    },
    legend: {
      show: series.length > 1,
      labels: { colors: "#cbd5e1" },
      position: "top",
      horizontalAlign: "left",
    },
    plotOptions: {
      candlestick: {
        colors: { upward: "#34d399", downward: "#f87171" },
        wick: { useFillColor: true },
      },
    },
  };

  return (
    <div className="card chart-card">
      <div className="chart-toolbar">
        <div className="seg-control" role="group" aria-label="Chart type">
          {["candlestick", "line", "area"].map((t) => (
            <button
              key={t}
              type="button"
              className={chartType === t ? "active" : ""}
              onClick={() => onChartTypeChange(t)}
              aria-pressed={chartType === t}
            >
              {t === "candlestick" ? "Candles" : t === "line" ? "Line" : "Area"}
            </button>
          ))}
        </div>
        <div className="seg-control" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={range === RANGE_PARAM[r] ? "active" : ""}
              onClick={() => onRangeChange(RANGE_PARAM[r])}
              aria-pressed={range === RANGE_PARAM[r]}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="overlay-toggles" role="group" aria-label="Chart overlays">
        {OVERLAYS.map((ov) => (
          <label
            key={ov.id}
            className={`overlay-chip ${overlays[ov.id] ? "on" : ""}`}
            style={{ "--chip": ov.color }}
          >
            <input
              type="checkbox"
              checked={Boolean(overlays[ov.id])}
              onChange={() => onToggleOverlay(ov.id)}
            />
            {ov.label}
          </label>
        ))}
      </div>

      <Chart
        options={options}
        series={series}
        type={chartType}
        height={420}
      />
    </div>
  );
}
