import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { formatPrice } from "../services/format";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

/**
 * Forecast chart (Chart.js, as in the original app) with a 95% prediction
 * interval band. Every label states the model and horizon; nothing is
 * presented as a guaranteed outcome.
 */
export default function PredictionChart({ forecast, currency = "USD" }) {
  if (!forecast || !forecast.predictions || !forecast.predictions.length) {
    return (
      <div className="card chart-card">
        <p className="chart-empty">No forecast available.</p>
      </div>
    );
  }

  const labels = [
    "Today",
    ...forecast.predictions.map((_, i) => `Day ${i + 1}`),
  ];
  const main = [
    forecast.current_price,
    ...forecast.predictions,
  ];
  const upper = [forecast.current_price, ...forecast.upper];
  const lower = [forecast.current_price, ...forecast.lower];

  const data = {
    labels,
    datasets: [
      {
        label: "95% upper",
        data: upper,
        borderColor: "rgba(34,211,238,0.35)",
        backgroundColor: "rgba(34,211,238,0.10)",
        borderDash: [4, 4],
        pointRadius: 0,
        fill: "+1",
        tension: 0.25,
      },
      {
        label: "95% lower",
        data: lower,
        borderColor: "rgba(34,211,238,0.35)",
        backgroundColor: "rgba(34,211,238,0.10)",
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false,
        tension: 0.25,
      },
      {
        label: `${forecast.model} forecast`,
        data: main,
        borderColor: "#34d399",
        backgroundColor: "rgba(52,211,153,0.15)",
        pointRadius: (ctx) => (ctx.dataIndex === main.length - 1 ? 4 : 0),
        pointBackgroundColor: "#34d399",
        borderWidth: 2,
        fill: true,
        tension: 0.25,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: "#cbd5e1", filter: (i) => !i.text.includes("lower") && !i.text.includes("upper"), usePointStyle: true },
      },
      title: {
        display: true,
        text: `${forecast.horizon_days}-day forecast — ${forecast.model} (band = 95% prediction interval)`,
        color: "#94a3b8",
        font: { size: 12, weight: "normal" },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatPrice(ctx.parsed.y, currency)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#64748b", maxRotation: 0, autoSkip: true },
        grid: { color: "rgba(148,163,184,0.08)" },
      },
      y: {
        ticks: {
          color: "#64748b",
          callback: (v) => formatPrice(v, currency, v > 1000 ? 0 : 2),
        },
        grid: { color: "rgba(148,163,184,0.08)" },
      },
    },
  };

  return (
    <div className="card chart-card">
      <div style={{ position: "relative", height: 320 }}>
        <Line data={data} options={options} />
      </div>
      <p className="chart-note">{forecast.path_note}</p>
      <p className="disclaimer">{forecast.disclaimer}</p>
    </div>
  );
}
