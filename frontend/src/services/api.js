import axios from "axios";

/**
 * Single API service layer. All Axios calls go through here so components
 * never hardcode URLs. Base URL resolution order:
 *   1. localStorage override (Settings page — handy for local backend dev)
 *   2. REACT_APP_API_URL env variable (Vercel deployment config)
 *   3. current production URL (fallback keeps the app working as before)
 */
const PRODUCTION_URL = "https://market-ai-tracker.onrender.com";

function resolveBaseUrl() {
  try {
    const override = window.localStorage.getItem("mat_api_url");
    if (override && override.trim()) return override.trim().replace(/\/+$/, "");
  } catch (e) {
    /* localStorage unavailable */
  }
  const env = process.env.REACT_APP_API_URL;
  return (env || PRODUCTION_URL).replace(/\/+$/, "");
}

export const API_BASE = resolveBaseUrl();

const client = axios.create({ baseURL: API_BASE, timeout: 45000 });

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status || 0;
  }
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = "Something went wrong while contacting the server.";
    let status = 0;
    if (error.response) {
      status = error.response.status;
      message =
        error.response.data && error.response.data.error
          ? error.response.data.error
          : status === 404
          ? "Symbol not found or not supported by the data provider."
          : status === 429
          ? "Rate limited by the data provider. Please wait a moment and retry."
          : `Server error (${status}). Please try again.`;
    } else if (error.code === "ECONNABORTED") {
      message = "The request timed out. Please try again.";
    } else {
      message = "Backend unreachable. Check your connection or API URL in Settings.";
    }
    return Promise.reject(new ApiError(message, status));
  }
);

const get = (url, params) => client.get(url, { params }).then((r) => r.data);

/* Small TTL cache so re-visiting a page does not re-hit the backend. */
const cache = new Map();
const pending = new Map();
const cached = (key, ttlMs, fetcher) => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return Promise.resolve(hit.v);
  if (pending.has(key)) return pending.get(key);
  const request = fetcher().then((v) => {
    cache.set(key, { t: Date.now(), v });
    return v;
  }).finally(() => {
    pending.delete(key);
  });
  pending.set(key, request);
  return request;
};

const cachedGet = (key, ttlMs, url, params) =>
  cached(key, ttlMs, () => get(url, params));

export const api = {
  health: () => get("/health"),
  stock: (symbol) =>
    cachedGet(`stock:${symbol}`, 30000, `/stock/${encodeURIComponent(symbol)}`),
  history: (symbol, range = "1y") =>
    cachedGet(`history:${symbol}:${range}`, 300000, `/history/${encodeURIComponent(symbol)}`, { range }),
  indicators: (symbol, range = "1y") =>
    cachedGet(`indicators:${symbol}:${range}`, 300000, `/indicators/${encodeURIComponent(symbol)}`, { range }),
  predict: (symbol, days = 14) =>
    cachedGet(`predict:${symbol}:${days}`, 1800000, `/predict/${encodeURIComponent(symbol)}`, { days }),
  signal: (symbol) =>
    cachedGet(`signal:${symbol}`, 30000, `/signal/${encodeURIComponent(symbol)}`),
  news: (symbol, limit = 8) =>
    cachedGet(`news:${symbol}:${limit}`, 120000, `/news/${encodeURIComponent(symbol)}`, { limit }),
  marketNews: (query, limit = 12) =>
    cachedGet(`market-news:${query}:${limit}`, 120000, "/news", { q: query, limit }),
  search: (query, limit = 10) =>
    cached(`search:${query}:${limit}`, 60000, () =>
      get("/search", { q: query, limit })
    ),
  watchlists: () => cached("watchlists", 86400000, () => get("/watchlists")),
  compare: (symbols, days = 14) =>
    cachedGet(`compare:${symbols.join(",")}:${days}`, 30000, "/compare", {
      symbols: symbols.join(","),
      days,
    }),
};

export default api;
