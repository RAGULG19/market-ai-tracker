/**
 * Explainable BUY / SELL / HOLD card: signal, score, supporting factors,
 * conflicting factors, rule description and disclaimer.
 */
export default function SignalCard({ signal }) {
  if (!signal) return null;
  const cls =
    signal.signal === "BUY" ? "buy" : signal.signal === "SELL" ? "sell" : "hold";

  return (
    <section className="card signal-card" aria-label="Trading signal">
      <div className="signal-head">
        <div>
          <p className="card-kicker">Composite signal</p>
          <span className={`signal-badge ${cls}`}>{signal.signal}</span>
        </div>
        <div className="signal-score" title="supporting − conflicting">
          <span className="score-value">
            {signal.score > 0 ? `+${signal.score}` : signal.score}
          </span>
          <span className="score-label">score</span>
        </div>
      </div>
      <p className="signal-summary">{signal.summary}</p>

      <div className="factor-columns">
        <div>
          <h4 className="factor-title supporting">Supporting factors</h4>
          <ul className="factor-list">
            {signal.supporting.length === 0 && (
              <li className="factor none">— none —</li>
            )}
            {signal.supporting.map((f, i) => (
              <li className="factor supporting" key={`s-${i}`}>
                ✓ {f}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="factor-title conflicting">Conflicting factors</h4>
          <ul className="factor-list">
            {signal.conflicting.length === 0 && (
              <li className="factor none">— none —</li>
            )}
            {signal.conflicting.map((f, i) => (
              <li className="factor conflicting" key={`c-${i}`}>
                ⚠ {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <details className="signal-rules">
        <summary>How this signal is computed</summary>
        <p>{signal.rules}</p>
      </details>
      <p className="disclaimer">{signal.disclaimer}</p>
    </section>
  );
}
