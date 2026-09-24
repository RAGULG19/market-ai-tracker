import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import useDebounce from "../hooks/useDebounce";

const POPULAR = ["TCS.NS", "INFY.NS", "RELIANCE.NS", "AAPL", "MSFT", "NVDA"];

/**
 * Professional symbol search: debounced backend suggestions (company name,
 * ticker, symbol), keyboard navigation, recent + popular quick picks.
 */
export default function SearchBar({ onSelect, recents = [] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState("idle"); // idle | loading | empty | error
  const debounced = useDebounce(query, 300);
  const boxRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!debounced.trim()) {
      setResults([]);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    api
      .search(debounced.trim())
      .then((data) => {
        if (cancelled) return;
        setResults(data.results || []);
        setStatus((data.results || []).length ? "idle" : "empty");
        setActive(-1);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const choose = (symbol) => {
    setOpen(false);
    setQuery("");
    setActive(-1);
    onSelect(symbol);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && active >= 0 && results[active]) {
      choose(results[active].symbol);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showPanel = open && (query.trim() || recents.length > 0);

  return (
    <div className="search-bar" ref={boxRef}>
      <label htmlFor="symbol-search" className="visually-hidden">
        Search stocks, ETFs, gold, indexes
      </label>
      <input
        id="symbol-search"
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="search-results"
        aria-autocomplete="list"
        placeholder="Search TCS, INFY, RELIANCE, AAPL…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showPanel && (
        <div className="search-panel" id="search-results" role="listbox">
          {query.trim() === "" && recents.length > 0 && (
            <>
              <p className="search-group">Recent</p>
              {recents.slice(0, 5).map((s) => (
                <button
                  key={`r-${s}`}
                  type="button"
                  className="search-item"
                  onClick={() => choose(s)}
                >
                  <span className="sym">{s}</span>
                </button>
              ))}
              <p className="search-group">Popular</p>
              {POPULAR.map((s) => (
                <button
                  key={`p-${s}`}
                  type="button"
                  className="search-item"
                  onClick={() => choose(s)}
                >
                  <span className="sym">{s}</span>
                </button>
              ))}
            </>
          )}
          {status === "loading" && (
            <p className="search-hint">Searching…</p>
          )}
          {status === "empty" && (
            <p className="search-hint">
              No matches. Try a full symbol like TCS.NS or AAPL.
            </p>
          )}
          {status === "error" && (
            <p className="search-hint">Search unavailable right now.</p>
          )}
          {results.map((r, i) => (
            <button
              key={r.symbol}
              type="button"
              role="option"
              aria-selected={i === active}
              className={`search-item ${i === active ? "active" : ""}`}
              onClick={() => choose(r.symbol)}
            >
              <span className="sym">{r.symbol}</span>
              <span className="name">{r.name}</span>
              {r.exchange ? <span className="exch">{r.exchange}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
