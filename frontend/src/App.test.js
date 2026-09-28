import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";
jest.mock("@auth0/auth0-react", () => ({ useAuth0: jest.fn() }));
import { useAuth0 } from "@auth0/auth0-react";
import api from "./services/api";

/* Chart libraries are not render-testable in jsdom (and apexcharts uses
   package "exports" subpaths that Jest 27 cannot resolve). */
jest.mock("react-apexcharts", () => () => null);
jest.mock("react-chartjs-2", () => ({ Line: () => null }));

/* Keep tests offline and deterministic: never-resolving API promises. */
jest.mock("./services/api", () => {
  const pending = () => new Promise(() => {});
  const api = {
    quote: jest.fn(pending),
    quoteSummary: pending,
    stock: pending,
    history: pending,
    indicators: pending,
    predict: pending,
    signal: pending,
    news: pending,
    marketNews: pending,
    watchlists: jest.fn(pending),
    compare: pending,
    health: pending,
    search: () => Promise.resolve({ results: [] }),
    setAccessTokenProvider: jest.fn(),
  };
  return {
    __esModule: true,
    default: api,
    api,
    setAccessTokenProvider: jest.fn(),
    API_BASE: "http://testserver",
    ApiError: class ApiError extends Error {},
  };
});

const authenticatedState = () => ({
  error: null,
  getAccessTokenSilently: () => Promise.resolve("test-access-token"),
  isAuthenticated: true,
  isLoading: false,
  loginWithRedirect: jest.fn().mockResolvedValue(undefined),
  logout: jest.fn().mockResolvedValue(undefined),
  user: { email: "analyst@example.test", name: "Test Analyst" },
});

beforeEach(() => {
  useAuth0.mockReturnValue(authenticatedState());
});

test("renders brand, navigation, and independent dashboard loading states", async () => {
  render(<App />);
  expect(
    screen.getByRole("button", { name: /Market AI Tracker/i })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
  expect(screen.getByRole("navigation")).toBeInTheDocument();
  expect(screen.getByRole("combobox")).toBeInTheDocument();
  expect(
    await screen.findByText("Loading TCS.NS quote…", {}, { timeout: 5000 })
  ).toBeInTheDocument();
  expect(screen.getByText("Loading market news…")).toBeInTheDocument();
  expect(screen.getByText("Loading TCS.NS price history…")).toBeInTheDocument();
});

test("Markets displays a quote returned as the overview object", async () => {
  api.watchlists.mockResolvedValueOnce({
    watchlists: {
      popular: [{ symbol: "AAPL", name: "Apple Inc." }],
    },
  });
  api.quote.mockResolvedValueOnce({
    symbol: "AAPL",
    current_price: 123.45,
    currency: "USD",
    change_pct: 1.25,
  });

  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Markets" }));

  expect(await screen.findByText("$123.45")).toBeInTheDocument();
  expect(screen.getByText("+1.25%")).toBeInTheDocument();
  expect(api.quote).toHaveBeenCalledWith("AAPL");
});

test("Portfolio uses the direct quote object for current value", async () => {
  window.localStorage.setItem(
    "mat_portfolio",
    JSON.stringify([{ symbol: "AAPL", quantity: 2, buyPrice: 100 }])
  );
  api.quote.mockResolvedValueOnce({
    symbol: "AAPL",
    name: "Apple Inc.",
    current_price: 123.45,
    currency: "USD",
    change_pct: 1.25,
  });

  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Portfolio" }));

  expect(await screen.findByText("Apple Inc.")).toBeInTheDocument();
  expect(screen.getByText("$123.45")).toBeInTheDocument();
  window.localStorage.removeItem("mat_portfolio");
});

test("signed-out visitors see the branded entry and signup requests Universal Login signup", () => {
  const loginWithRedirect = jest.fn().mockResolvedValue(undefined);
  useAuth0.mockReturnValue({
    ...authenticatedState(),
    isAuthenticated: false,
    loginWithRedirect,
  });

  render(<App />);

  expect(screen.getByRole("heading", { name: "Your market workspace" })).toBeInTheDocument();
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(loginWithRedirect).toHaveBeenCalledWith({
    authorizationParams: { screen_hint: "signup" },
  });
});

test("login redirect failures show a safe user-facing message", async () => {
  useAuth0.mockReturnValue({
    ...authenticatedState(),
    isAuthenticated: false,
    loginWithRedirect: jest.fn().mockRejectedValue(new Error("private detail")),
  });

  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

  expect(
    await screen.findByText("Unable to start sign-in. Please try again.")
  ).toBeInTheDocument();
  expect(screen.queryByText("private detail")).not.toBeInTheDocument();
});

test("authenticated user can sign out through Auth0", () => {
  const logout = jest.fn().mockResolvedValue(undefined);
  useAuth0.mockReturnValue({ ...authenticatedState(), logout });

  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

  expect(logout).toHaveBeenCalledWith({
    logoutParams: { returnTo: window.location.origin },
  });
});

