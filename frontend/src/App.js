import { useCallback, useState } from "react";
import "./App.css";
import "./styles/charts.css";
import Navbar from "./components/Navbar";
import SearchBar from "./components/SearchBar";
import ToastHost from "./components/Toast";
import DashboardPage from "./pages/DashboardPage";
import MarketsPage from "./pages/MarketsPage";
import ComparePage from "./pages/ComparePage";
import PortfolioPage from "./pages/PortfolioPage";
import NewsPage from "./pages/NewsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import useLocalStorage from "./hooks/useLocalStorage";

const DEFAULT_SYMBOL = "TCS.NS";

/**
 * Application shell: navigation, global search, lightweight state-based
 * routing (no extra dependency), recent-search persistence.
 */
function App() {
  const [route, setRoute] = useState("dashboard");
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [recents, setRecents] = useLocalStorage("mat_recents", []);
  const [compareSymbols, setCompareSymbols] = useLocalStorage(
    "mat_compare",
    ["TCS.NS", "INFY.NS", "RELIANCE.NS"]
  );

  const openSymbol = useCallback(
    (sym) => {
      setSymbol(sym);
      setRecents((prev) => [sym, ...prev.filter((s) => s !== sym)].slice(0, 8));
      setRoute("dashboard");
    },
    [setRecents]
  );

  return (
    <div className="app">
      <Navbar route={route} onNavigate={setRoute}>
        <SearchBar onSelect={openSymbol} recents={recents} />
      </Navbar>

      <main className="main" id="main">
        {route === "dashboard" && <DashboardPage symbol={symbol} />}
        {route === "markets" && <MarketsPage onOpen={openSymbol} />}
        {route === "compare" && (
          <ComparePage
            symbols={compareSymbols}
            setSymbols={setCompareSymbols}
            onOpen={openSymbol}
          />
        )}
        {route === "portfolio" && <PortfolioPage />}
        {route === "news" && <NewsPage />}
        {route === "analytics" && <AnalyticsPage symbol={symbol} />}
        {route === "settings" && <SettingsPage />}
      </main>

      <footer className="footer">
        <p>
          AI-generated market analysis for informational purposes only. Not
          financial advice. · Market data by Yahoo Finance.
        </p>
        <p className="footer-credit">
          Built &amp; Developed by{" "}
          <a href="https://www.linkedin.com/in/ragulg07" target="_blank" rel="noopener noreferrer">
            RAGUL G
          </a>
          <span> · © 2026 RAGUL G. All rights reserved.</span>
        </p>
      </footer>

      <ToastHost />
    </div>
  );
}

export default App;
