import { render, screen } from "@testing-library/react";
import App from "./App";

/* Chart libraries are not render-testable in jsdom (and apexcharts uses
   package "exports" subpaths that Jest 27 cannot resolve). */
jest.mock("react-apexcharts", () => () => null);
jest.mock("react-chartjs-2", () => ({ Line: () => null }));

/* Keep tests offline and deterministic: never-resolving API promises. */
jest.mock("./services/api", () => {
  const pending = () => new Promise(() => {});
  const api = {
    stock: pending,
    history: pending,
    indicators: pending,
    predict: pending,
    signal: pending,
    news: pending,
    marketNews: pending,
    watchlists: pending,
    compare: pending,
    health: pending,
    search: () => Promise.resolve({ results: [] }),
  };
  return {
    __esModule: true,
    default: api,
    api,
    API_BASE: "http://testserver",
    ApiError: class ApiError extends Error {},
  };
});

test("renders brand and navigation", () => {
  render(<App />);
  expect(
    screen.getByRole("button", { name: /Market AI Tracker/i })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
  expect(screen.getByRole("navigation")).toBeInTheDocument();
  expect(screen.getByRole("combobox")).toBeInTheDocument();
});

