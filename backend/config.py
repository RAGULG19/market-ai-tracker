"""Central configuration: environment variables, symbol aliases and curated
watchlists.

IMPORTANT: the watchlists are *curated examples* of supported instruments
for quick access and search — they are NOT a claim that every symbol exists.
The actual data provider (Yahoo Finance via yfinance) decides what is
available; unknown symbols return a clear error.
"""
import os

try:  # python-dotenv is optional (local development convenience only)
    from dotenv import load_dotenv
    load_dotenv()
except Exception:  # pragma: no cover
    pass

PORT = int(os.environ.get("PORT", "10000"))

# CORS is an exact-origin allowlist; wildcard entries are ignored.
DEFAULT_CORS_ORIGINS = (
    "https://market-ai-tracker.vercel.app,"
    "http://localhost:3000,http://127.0.0.1:3000"
)
_cors_origins = os.environ.get("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
if "*" in {origin.strip() for origin in _cors_origins.split(",")}:
    _cors_origins = DEFAULT_CORS_ORIGINS
CORS_ORIGINS = _cors_origins

AUTH0_ISSUER = os.environ.get(
    "AUTH0_ISSUER", "https://ragulg.us.auth0.com/"
).strip()
if AUTH0_ISSUER and not AUTH0_ISSUER.endswith("/"):
    AUTH0_ISSUER += "/"
AUTH0_AUDIENCE = os.environ.get(
    "AUTH0_AUDIENCE", "https://market-ai-tracker-api"
).strip()
AUTH0_JWKS_URL = os.environ.get(
    "AUTH0_JWKS_URL",
    "%s.well-known/jwks.json" % AUTH0_ISSUER,
).strip()

# Cache lifetimes in seconds (keeps Render/yfinance call volume low).
CACHE_TTL_HISTORY = int(os.environ.get("CACHE_TTL_HISTORY", "300"))
CACHE_TTL_OVERVIEW = int(os.environ.get("CACHE_TTL_OVERVIEW", "60"))
CACHE_TTL_PREDICT = int(os.environ.get("CACHE_TTL_PREDICT", "1800"))

DEFAULT_FORECAST_DAYS = 14

# Legacy aliases used by the original /predict endpoint (kept for backward
# compatibility with the deployed frontend) plus a few common additions.
SYMBOL_ALIASES = {
    "TCS": "TCS.NS",
    "INFY": "INFY.NS",
    "RELIANCE": "RELIANCE.NS",
    "SBIN": "SBIN.NS",
    "HDFCBANK": "HDFCBANK.NS",
    "ITC": "ITC.NS",
    "WIPRO": "WIPRO.NS",
    "TATASTEEL": "TATASTEEL.NS",
    "MARUTI": "MARUTI.NS",
    "AXISBANK": "AXISBANK.NS",
    "ADANI": "ADANIENT.NS",
    "ICICIBANK": "ICICIBANK.NS",
    "KOTAKBANK": "KOTAKBANK.NS",
    "BHARTIARTL": "BHARTIARTL.NS",
    "LT": "LT.NS",
    "TATAMOTORS": "TATAMOTORS.NS",
    "HINDUNILVR": "HINDUNILVR.NS",
    "NIFTY": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "SENSEX": "^BSESN",
    "GOLD": "GLD",
    "GOLDBEES": "GOLDBEES.NS",
    "NIFTYBEES": "NIFTYBEES.NS",
}

INDIAN_SUFFIXES = (".NS", ".BO")
INR_INDEXES = ("^NSEI", "^NSEBANK", "^BSESN")

# Curated watchlists: {label: [{symbol, name}, ...]}
WATCHLISTS = {
    "popular": [
        {"symbol": "RELIANCE.NS", "name": "Reliance Industries"},
        {"symbol": "TCS.NS", "name": "Tata Consultancy Services"},
        {"symbol": "INFY.NS", "name": "Infosys"},
        {"symbol": "HDFCBANK.NS", "name": "HDFC Bank"},
        {"symbol": "ICICIBANK.NS", "name": "ICICI Bank"},
        {"symbol": "SBIN.NS", "name": "State Bank of India"},
        {"symbol": "AAPL", "name": "Apple Inc."},
        {"symbol": "MSFT", "name": "Microsoft Corp."},
        {"symbol": "NVDA", "name": "NVIDIA Corp."},
        {"symbol": "SPY", "name": "SPDR S&P 500 ETF"},
        {"symbol": "GLD", "name": "SPDR Gold Shares"},
    ],
    "india": [
        {"symbol": "TCS.NS", "name": "Tata Consultancy Services"},
        {"symbol": "INFY.NS", "name": "Infosys"},
        {"symbol": "RELIANCE.NS", "name": "Reliance Industries"},
        {"symbol": "HDFCBANK.NS", "name": "HDFC Bank"},
        {"symbol": "ICICIBANK.NS", "name": "ICICI Bank"},
        {"symbol": "SBIN.NS", "name": "State Bank of India"},
        {"symbol": "ITC.NS", "name": "ITC Ltd"},
        {"symbol": "WIPRO.NS", "name": "Wipro Ltd"},
        {"symbol": "TATASTEEL.NS", "name": "Tata Steel"},
        {"symbol": "MARUTI.NS", "name": "Maruti Suzuki India"},
        {"symbol": "AXISBANK.NS", "name": "Axis Bank"},
        {"symbol": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank"},
        {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel"},
        {"symbol": "LT.NS", "name": "Larsen & Toubro"},
        {"symbol": "TATAMOTORS.NS", "name": "Tata Motors"},
        {"symbol": "HINDUNILVR.NS", "name": "Hindustan Unilever"},
        {"symbol": "ADANIENT.NS", "name": "Adani Enterprises"},
        {"symbol": "NTPC.NS", "name": "NTPC Ltd"},
        {"symbol": "POWERGRID.NS", "name": "Power Grid Corp"},
        {"symbol": "TCS.BO", "name": "Tata Consultancy Services (BSE)"},
    ],
    "us": [
        {"symbol": "AAPL", "name": "Apple Inc."},
        {"symbol": "MSFT", "name": "Microsoft Corp."},
        {"symbol": "NVDA", "name": "NVIDIA Corp."},
        {"symbol": "GOOGL", "name": "Alphabet Inc."},
        {"symbol": "AMZN", "name": "Amazon.com Inc."},
        {"symbol": "TSLA", "name": "Tesla Inc."},
        {"symbol": "META", "name": "Meta Platforms"},
        {"symbol": "JPM", "name": "JPMorgan Chase"},
    ],
    "etfs": [
        {"symbol": "SPY", "name": "SPDR S&P 500 ETF"},
        {"symbol": "QQQ", "name": "Invesco QQQ Trust"},
        {"symbol": "DIA", "name": "SPDR Dow Jones ETF"},
        {"symbol": "IWM", "name": "iShares Russell 2000 ETF"},
        {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF"},
        {"symbol": "NIFTYBEES.NS", "name": "Nippon India NIFTY BEES"},
    ],
    "gold": [
        {"symbol": "GLD", "name": "SPDR Gold Shares"},
        {"symbol": "IAUM", "name": "iShares Gold Trust"},
        {"symbol": "GOLDBEES.NS", "name": "Nippon India Gold BEES"},
        {"symbol": "SBIGOLD.NS", "name": "SBI Gold ETF"},
    ],
    "indexes": [
        {"symbol": "^NSEI", "name": "NIFTY 50"},
        {"symbol": "^NSEBANK", "name": "NIFTY BANK"},
        {"symbol": "^BSESN", "name": "BSE SENSEX"},
        {"symbol": "^GSPC", "name": "S&P 500"},
        {"symbol": "^IXIC", "name": "NASDAQ Composite"},
        {"symbol": "^DJI", "name": "Dow Jones Industrial Average"},
    ],
}


def resolve_symbol(raw):
    """Normalize user input into a yfinance-compatible symbol."""
    if not raw:
        return ""
    s = str(raw).strip().upper().replace("$", "").replace(" ", "")
    if not s:
        return ""
    return SYMBOL_ALIASES.get(s, s)


def currency_for(symbol, info_currency=None):
    """Best-effort currency for a symbol: INR for Indian instruments."""
    if symbol.endswith(INDIAN_SUFFIXES) or symbol in INR_INDEXES:
        return "INR"
    if info_currency:
        return str(info_currency).upper()
    return "USD"


def exchange_guess(symbol):
    """Exchange label used when the provider does not return one."""
    if symbol.endswith(".NS"):
        return "National Stock Exchange (NSE)"
    if symbol.endswith(".BO"):
        return "Bombay Stock Exchange (BSE)"
    return "Unknown exchange"


def display_name(symbol):
    """Curated display name for a symbol, or the symbol itself."""
    for entries in WATCHLISTS.values():
        for e in entries:
            if e["symbol"] == symbol:
                return e["name"]
    return symbol

