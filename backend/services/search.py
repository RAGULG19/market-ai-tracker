"""Symbol search: curated config first, Yahoo lookup as an enhancement.

The curated lists in config.py give instant, dependency-free suggestions
(popular / India / US / ETFs / gold / indexes). Yahoo's search endpoint
adds coverage for anything else the provider knows about. Unknown symbols
are never claimed to exist — the data provider decides at fetch time.
"""
import yfinance as yf

from config import SYMBOL_ALIASES, WATCHLISTS, display_name


def _curated(query, limit):
    q = (query or "").strip().upper()
    out = []
    if not q:
        return out
    # Exact alias hit first: "TCS" -> "TCS.NS"
    if q in SYMBOL_ALIASES:
        sym = SYMBOL_ALIASES[q]
        out.append(
            {
                "symbol": sym,
                "name": display_name(sym),
                "exchange": "NSE" if sym.endswith(".NS") else "",
                "type": "Equity",
                "source": "alias",
            }
        )
    seen = {e["symbol"] for e in out}
    for entries in WATCHLISTS.values():
        for e in entries:
            if e["symbol"] in seen:
                continue
            if q in e["symbol"] or q in e["name"].upper():
                out.append(
                    {
                        "symbol": e["symbol"],
                        "name": e["name"],
                        "exchange": (
                            "NSE" if e["symbol"].endswith(".NS")
                            else "BSE" if e["symbol"].endswith(".BO")
                            else ""
                        ),
                        "type": "Curated",
                        "source": "curated",
                    }
                )
                seen.add(e["symbol"])
                if len(out) >= limit:
                    return out
    return out


def _yahoo(query, limit):
    quotes = []
    try:
        quotes = yf.Search(query, max_results=limit).quotes or []
    except Exception:
        try:
            import requests
            resp = requests.get(
                "https://query2.finance.yahoo.com/v1/finance/search",
                params={"q": query, "quotesCount": limit, "newsCount": 0},
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=8,
            )
            if resp.ok:
                quotes = (resp.json() or {}).get("quotes", []) or []
        except Exception:
            quotes = []
    out = []
    for q in quotes:
        sym = q.get("symbol")
        if not sym:
            continue
        out.append(
            {
                "symbol": sym,
                "name": q.get("shortname") or q.get("longname") or sym,
                "exchange": q.get("exchDisp") or q.get("exchange") or "",
                "type": q.get("quoteType") or q.get("typeDisp") or "",
                "source": "yahoo",
            }
        )
    return out


def search_symbols(query, limit=10):
    results = _curated(query, limit)
    seen = {e["symbol"] for e in results}
    for entry in _yahoo(query, limit):
        if entry["symbol"] not in seen:
            results.append(entry)
            seen.add(entry["symbol"])
        if len(results) >= limit:
            break
    return results[:limit]


def get_watchlists():
    return WATCHLISTS
