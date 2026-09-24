import { useEffect, useState } from "react";
import api, { API_BASE } from "../services/api";
import { toast } from "../services/toast";

/** Settings: API URL override, connection check, local data management. */
export default function SettingsPage() {
  const [url, setUrl] = useState(API_BASE);
  const [status, setStatus] = useState("idle"); // idle | checking | ok | fail

  useEffect(() => {
    setStatus("checking");
    api
      .health()
      .then(() => setStatus("ok"))
      .catch(() => setStatus("fail"));
  }, []);

  const saveUrl = (e) => {
    e.preventDefault();
    try {
      window.localStorage.setItem("mat_api_url", url.trim());
      toast("API URL saved. Reloading…", "success");
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      toast("Could not save settings.", "error");
    }
  };

  const resetUrl = () => {
    window.localStorage.removeItem("mat_api_url");
    toast("Reset to default API URL. Reloading…", "info");
    setTimeout(() => window.location.reload(), 600);
  };

  const clearData = () => {
    ["mat_portfolio", "mat_recents", "mat_api_url"].forEach((k) =>
      window.localStorage.removeItem(k)
    );
    toast("Local data cleared. Reloading…", "info");
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div className="settings-page">
      <section className="card">
        <h2 className="page-title">Settings</h2>

        <dl className="fact-list">
          <div>
            <dt>Active API URL</dt>
            <dd className="mono">{API_BASE}</dd>
          </div>
          <div>
            <dt>Backend health</dt>
            <dd>
              {status === "checking" && "Checking…"}
              {status === "ok" && <span className="up">● reachable</span>}
              {status === "fail" && <span className="down">● unreachable</span>}
              {status === "idle" && "—"}
            </dd>
          </div>
          <div>
            <dt>Data provider</dt>
            <dd>Yahoo Finance (via yfinance) — delayed quotes</dd>
          </div>
        </dl>

        <form className="settings-form" onSubmit={saveUrl}>
          <label htmlFor="api-url">
            Backend API URL override (local development)
            <input
              id="api-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:10000"
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Save &amp; reload
            </button>
            <button type="button" className="btn btn-ghost" onClick={resetUrl}>
              Reset to default
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h3 className="card-title">Local data</h3>
        <p className="chart-note">
          Portfolio, recent searches and settings are stored only in this
          browser (localStorage). Nothing is sent to any server except market
          data requests.
        </p>
        <button type="button" className="btn btn-danger" onClick={clearData}>
          Clear local data
        </button>
      </section>

      <section className="card">
        <h3 className="card-title">About</h3>
        <p className="chart-note">
          Market AI Tracker — AI-powered stock market analytics for
          informational and educational purposes. Not financial advice.
        </p>
      </section>
    </div>
  );
}
