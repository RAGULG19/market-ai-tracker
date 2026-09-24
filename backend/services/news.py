"""News fetching + sentiment.

Data source: Yahoo Finance news via yfinance. Only real headlines returned
by the provider are ever shown — this service never fabricates articles.

Sentiment: computed with a small, transparent financial keyword lexicon
(word lists below). The method string is returned with every response so
the UI can label it honestly. This is NOT a trained NLP model.
"""
from datetime import datetime, timezone

import yfinance as yf

POSITIVE_WORDS = {
    "surge", "surges", "soar", "soars", "rally", "rallies", "gain", "gains",
    "profit", "profits", "record", "beat", "beats", "upgrade", "upgraded",
    "bullish", "growth", "grows", "strong", "boost", "boosts", "buyback",
    "breakthrough", "recovery", "optimistic", "outperform", "jump", "jumps",
    "rise", "rises", "rising", "high", "milestone", "approve", "approved",
    "win", "wins", "tops", "exceed", "exceeds", "solid", "positive",
}
NEGATIVE_WORDS = {
    "drop", "drops", "fall", "falls", "plunge", "plunges", "loss", "losses",
    "miss", "misses", "downgrade", "downgraded", "bearish", "lawsuit",
    "probe", "investigation", "recall", "fraud", "fine", "fines", "weak",
    "warning", "warns", "bankrupt", "bankruptcy", "layoff", "layoffs",
    "sink", "sinks", "decline", "declines", "fear", "fears", "risk",
    "concern", "crash", "tumble", "tumbles", "low", "cut", "cuts", "negative",
    "fraud", "penalty", "probe", "volatile",
}

LEXICON_METHOD = (
    "Sentiment via rule-based lexicon keyword scoring over the headline "
    "(custom financial word lists; positive_hits - negative_hits). "
    "Not a trained ML model."
)


def classify_sentiment(text):
    """Return {label, score, matched} from word-match counts."""
    if not text:
        return {"label": "Neutral", "score": 0, "matched": []}
    tokens = [
        w.strip(".,!?;:\"'()$").lower()
        for w in str(text).split()
    ]
    pos = sorted({w for w in tokens if w in POSITIVE_WORDS})
    neg = sorted({w for w in tokens if w in NEGATIVE_WORDS})
    score = len(pos) - len(neg)
    label = "Positive" if score > 0 else ("Negative" if score < 0 else "Neutral")
    return {
        "label": label,
        "score": score,
        "matched": {"positive": pos, "negative": neg},
    }


def _normalize(item):
    """Handle both old and new yfinance news item formats."""
    content = item.get("content") if isinstance(item.get("content"), dict) else {}
    title = content.get("title") or item.get("title")
    if not title:
        return None
    url = None
    canon = content.get("canonicalUrl")
    if isinstance(canon, dict):
        url = canon.get("url")
    url = url or content.get("link") or item.get("link")
    provider = None
    prov = content.get("provider") or item.get("publisher")
    if isinstance(prov, dict):
        provider = prov.get("displayName")
    else:
        provider = prov
    pub = content.get("pubDate") or item.get("providerPublishTime")
    when = None
    if isinstance(pub, (int, float)):
        when = datetime.fromtimestamp(pub, tz=timezone.utc).isoformat()
    elif isinstance(pub, str):
        try:
            when = datetime.fromisoformat(pub.replace("Z", "+00:00")).isoformat()
        except ValueError:
            when = pub
    summary = content.get("summary") or ""
    text = "%s. %s" % (title, summary)
    return {
        "title": title,
        "url": url,
        "source": provider or "Unknown source",
        "published": when,
        "sentiment": classify_sentiment(text),
    }


def fetch_news(symbol=None, query=None, limit=8):
    """Real news for a symbol (or market news when only query given)."""
    raw_items, error = [], None
    try:
        if symbol:
            raw_items = yf.Ticker(symbol).news or []
        else:
            raw_items = yf.Search(query or "stock market", news_count=limit).news or []
    except Exception as exc:
        error = str(exc)
        raw_items = []
        # Fallback: Yahoo's public search endpoint (same data yf.Search uses)
        try:
            import requests
            resp = requests.get(
                "https://query2.finance.yahoo.com/v1/finance/search",
                params={
                    "q": query or "stock market",
                    "newsCount": limit,
                    "quotesCount": 0,
                },
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=10,
            )
            if resp.ok:
                raw_items = (resp.json() or {}).get("news", []) or []
                error = None
        except Exception:
            pass

    items = []
    for raw in raw_items:
        norm = _normalize(raw)
        if norm:
            items.append(norm)
        if len(items) >= limit:
            break

    if not items:
        return {
            "available": False,
            "method": LEXICON_METHOD,
            "items": [],
            "unavailable_reason": error
            or "No recent news returned by the provider for this symbol.",
        }
    return {
        "available": True,
        "method": LEXICON_METHOD,
        "items": items,
        "unavailable_reason": None,
    }
