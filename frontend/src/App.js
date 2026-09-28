import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "./App.css";
import "./styles/charts.css";
import Navbar from "./components/Navbar";
import SearchBar from "./components/SearchBar";
import ToastHost from "./components/Toast";
import LoadingState from "./components/LoadingState";
import useLocalStorage from "./hooks/useLocalStorage";
import { setAccessTokenProvider } from "./services/api";

const DEFAULT_SYMBOL = "TCS.NS";
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const MarketsPage = lazy(() => import("./pages/MarketsPage"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage"));
const NewsPage = lazy(() => import("./pages/NewsPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

/**
 * Application shell: navigation, global search, lightweight state-based
 * routing (no extra dependency), recent-search persistence.
 */
function App() {
  const {
    error: auth0Error,
    getAccessTokenSilently,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    user,
  } = useAuth0();
  const [route, setRoute] = useState("dashboard");
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [authActionError, setAuthActionError] = useState(null);
  const [sessionRejected, setSessionRejected] = useState(false);
  const [apiReady, setApiReady] = useState(false);
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

  useEffect(() => {
    if (!isAuthenticated || sessionRejected) {
      setAccessTokenProvider(null);
      setApiReady(false);
      return undefined;
    }
    setAccessTokenProvider(getAccessTokenSilently);
    setApiReady(true);
    return () => setAccessTokenProvider(null);
  }, [getAccessTokenSilently, isAuthenticated, sessionRejected]);

  const startLogin = async (screenHint) => {
    setAuthActionError(null);
    setSessionRejected(false);
    try {
      await loginWithRedirect(
        screenHint
          ? { authorizationParams: { screen_hint: screenHint } }
          : undefined
      );
    } catch (_error) {
      setAuthActionError("Unable to start sign-in. Please try again.");
    }
  };

  const startLogout = async () => {
    try {
      await logout({ logoutParams: { returnTo: window.location.origin } });
    } catch (_error) {
      setAuthActionError("Unable to sign out. Please try again.");
    }
  };

  useEffect(() => {
    const rejectSession = () => setSessionRejected(true);
    window.addEventListener("market-ai-unauthorized", rejectSession);
    return () =>
      window.removeEventListener("market-ai-unauthorized", rejectSession);
  }, []);

  if (isLoading) {
    return (
      <div className="app">
        <main className="main">
          <LoadingState label="Restoring secure session…" />
        </main>
      </div>
    );
  }

  if (!isAuthenticated || sessionRejected) {
    return (
      <AuthEntry
        error={
          authActionError ||
          (sessionRejected
            ? "Your session could not be verified. Sign in again."
            : auth0Error
            ? "Unable to restore your sign-in session. Please try again."
            : null)
        }
        onLogin={() => startLogin()}
        onSignup={() => startLogin("signup")}
      />
    );
  }

  if (!apiReady) {
    return (
      <div className="app">
        <main className="main">
          <LoadingState label="Securing backend connection…" />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar
        route={route}
        onNavigate={setRoute}
        userLabel={user && (user.name || user.email)}
        onLogout={startLogout}
      >
        <SearchBar onSelect={openSymbol} recents={recents} />
      </Navbar>

      <main className="main" id="main">
        <Suspense fallback={<LoadingState label="Loading view…" />}>
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
        </Suspense>
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

function AuthEntry({ error, onLogin, onSignup }) {
  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-labelledby="auth-title">
        <span className="auth-mark" aria-hidden="true">◈</span>
        <p className="auth-eyebrow">Market AI Tracker</p>
        <h1 id="auth-title">Your market workspace</h1>
        <p className="auth-description">
          Sign in securely to continue to your research and market analysis.
        </p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <div className="auth-actions">
          <button type="button" className="btn btn-primary" onClick={onLogin}>
            Sign in
          </button>
          <button type="button" className="btn btn-ghost" onClick={onSignup}>
            Create account
          </button>
        </div>
        <p className="auth-provider-note">Secure authentication by Auth0</p>
      </section>
    </main>
  );
}

export default App;
