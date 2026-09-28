const API_URL = "https://api.market-tracker.test";

beforeEach(() => {
  process.env.REACT_APP_API_URL = API_URL;
  window.localStorage.removeItem("mat_api_url");
  jest.resetModules();
});

afterEach(() => {
  delete process.env.REACT_APP_API_URL;
  window.localStorage.removeItem("mat_api_url");
});

test("adds a bearer token only for protected requests to the configured API origin", async () => {
  const { attachBearerToken } = require("./api");
  const tokenProvider = jest.fn().mockResolvedValue("test-token");

  const protectedConfig = await attachBearerToken(
    { url: "/quote/TCS", baseURL: API_URL, headers: {} },
    tokenProvider
  );
  expect(protectedConfig.headers.Authorization).toBe("Bearer test-token");
  expect(tokenProvider).toHaveBeenCalledTimes(1);

  const healthConfig = await attachBearerToken(
    { url: "/health", baseURL: API_URL, headers: {} },
    tokenProvider
  );
  expect(healthConfig.headers.Authorization).toBeUndefined();

  const externalConfig = await attachBearerToken(
    {
      url: "https://external.example/upload",
      baseURL: API_URL,
      headers: {},
    },
    tokenProvider
  );
  expect(externalConfig.headers.Authorization).toBeUndefined();
  expect(tokenProvider).toHaveBeenCalledTimes(1);
});